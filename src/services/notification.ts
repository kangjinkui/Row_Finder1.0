/**
 * Notification Service
 * Handles email and in-app notifications
 */

import type { Notification, User, ImpactAnalysis } from '../types/database';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface NotificationPayload {
  user_id: string;
  analysis_id: string;
  notification_type: 'urgent' | 'normal' | 'info';
  title: string;
  message: string;
}

/**
 * Send email notification using SendGrid
 */
export async function sendEmail(
  options: EmailOptions,
  apiKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!apiKey) {
      console.warn('[Notification] SendGrid API key not configured');
      return { success: false, error: 'API key not configured' };
    }

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: options.to }]
        }],
        from: {
          email: 'noreply@law-analysis.go.kr',
          name: 'AI 자치법규 영향 분석 시스템'
        },
        subject: options.subject,
        content: [
          {
            type: 'text/html',
            value: options.html
          },
          ...(options.text ? [{
            type: 'text/plain',
            value: options.text
          }] : [])
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[Notification] SendGrid error:', errorData);
      return {
        success: false,
        error: errorData.errors?.[0]?.message || 'Failed to send email'
      };
    }

    return { success: true };

  } catch (error) {
    console.error('[Notification] Error sending email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Create in-app notification
 */
export async function createNotification(
  payload: NotificationPayload,
  dbService: any // DatabaseService instance
): Promise<Notification | null> {
  try {
    const notification: Omit<Notification, 'sent_at'> = {
      notification_id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: payload.user_id,
      analysis_id: payload.analysis_id,
      notification_type: payload.notification_type,
      title: payload.title,
      message: payload.message,
      read: false
    };

    const created = await dbService.createNotification(notification);
    return created;

  } catch (error) {
    console.error('[Notification] Error creating notification:', error);
    return null;
  }
}

/**
 * Send notification to user (both email and in-app)
 */
export async function notifyUser(
  user: User,
  analysis: ImpactAnalysis,
  details: {
    lawName: string;
    regulationName: string;
    changeSummary: string;
  },
  dbService: any,
  sendGridApiKey?: string
): Promise<{ success: boolean; email_sent: boolean; notification_created: boolean }> {
  const result = {
    success: false,
    email_sent: false,
    notification_created: false
  };

  try {
    // Determine notification type based on impact level
    const notificationType = analysis.impact_level === 'HIGH' ? 'urgent' : 
                            analysis.impact_level === 'MEDIUM' ? 'normal' : 'info';

    const title = `[${analysis.impact_level}] ${details.lawName} 개정 영향 검토 필요`;
    const message = `${details.regulationName}에 영향을 미치는 법령 개정이 발생했습니다.\n\n${details.changeSummary}`;

    // Create in-app notification
    const notification = await createNotification({
      user_id: user.user_id,
      analysis_id: analysis.analysis_id,
      notification_type: notificationType,
      title,
      message
    }, dbService);

    result.notification_created = notification !== null;

    // Send email if user has email notifications enabled
    if (user.notification_settings.email_enabled && sendGridApiKey) {
      const emailHtml = generateEmailTemplate({
        userName: user.username,
        lawName: details.lawName,
        regulationName: details.regulationName,
        impactLevel: analysis.impact_level,
        impactType: analysis.impact_type,
        changeSummary: details.changeSummary,
        recommendation: analysis.ai_recommendation,
        analysisUrl: `https://law-analysis.go.kr/analysis/${analysis.analysis_id}`
      });

      const emailResult = await sendEmail({
        to: user.email,
        subject: title,
        html: emailHtml,
        text: message
      }, sendGridApiKey);

      result.email_sent = emailResult.success;
    }

    result.success = result.notification_created || result.email_sent;
    return result;

  } catch (error) {
    console.error('[Notification] Error notifying user:', error);
    return result;
  }
}

/**
 * Notify multiple users about an analysis
 */
export async function notifyUsers(
  users: User[],
  analysis: ImpactAnalysis,
  details: {
    lawName: string;
    regulationName: string;
    changeSummary: string;
  },
  dbService: any,
  sendGridApiKey?: string
): Promise<{
  total: number;
  notified: number;
  failed: number;
}> {
  const stats = {
    total: users.length,
    notified: 0,
    failed: 0
  };

  for (const user of users) {
    // Check if user wants notifications for this impact level
    const wantsNotification = user.notification_settings.impact_levels.includes(analysis.impact_level);

    if (!wantsNotification) {
      continue;
    }

    const result = await notifyUser(user, analysis, details, dbService, sendGridApiKey);

    if (result.success) {
      stats.notified++;
    } else {
      stats.failed++;
    }

    // Rate limiting: wait 100ms between notifications
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return stats;
}

/**
 * Generate email template
 */
function generateEmailTemplate(data: {
  userName: string;
  lawName: string;
  regulationName: string;
  impactLevel: string;
  impactType: string;
  changeSummary: string;
  recommendation: string;
  analysisUrl: string;
}): string {
  const impactColor = data.impactLevel === 'HIGH' ? '#dc2626' :
                     data.impactLevel === 'MEDIUM' ? '#f59e0b' : '#3b82f6';

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>법령 개정 알림</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Malgun Gothic', '맑은 고딕', sans-serif; background-color: #f3f4f6;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #1e40af; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">⚖️ AI 자치법규 영향 분석 시스템</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="font-size: 16px; color: #374151; margin: 0 0 20px;">안녕하세요, ${data.userName}님</p>
                            
                            <p style="font-size: 16px; color: #374151; margin: 0 0 30px;">
                                상위법령 개정으로 인해 검토가 필요한 자치법규가 발견되었습니다.
                            </p>
                            
                            <!-- Impact Badge -->
                            <div style="background-color: #f9fafb; padding: 20px; border-left: 4px solid ${impactColor}; margin-bottom: 30px;">
                                <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280;">영향도</p>
                                <p style="margin: 0; font-size: 24px; font-weight: bold; color: ${impactColor};">
                                    ${data.impactLevel}
                                </p>
                            </div>
                            
                            <!-- Details -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                                <tr>
                                    <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                                        <strong style="color: #374151;">개정 법령:</strong>
                                    </td>
                                    <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right; color: #6b7280;">
                                        ${data.lawName}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                                        <strong style="color: #374151;">영향받는 법규:</strong>
                                    </td>
                                    <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right; color: #6b7280;">
                                        ${data.regulationName}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                                        <strong style="color: #374151;">조치 권고:</strong>
                                    </td>
                                    <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right; color: #6b7280;">
                                        ${data.impactType}
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Summary -->
                            <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                                <h3 style="margin: 0 0 10px; color: #1e40af; font-size: 16px;">📋 변경 요약</h3>
                                <p style="margin: 0; color: #374151; line-height: 1.6;">
                                    ${data.changeSummary}
                                </p>
                            </div>
                            
                            <!-- Recommendation -->
                            <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                                <h3 style="margin: 0 0 10px; color: #92400e; font-size: 16px;">💡 AI 권고사항</h3>
                                <p style="margin: 0; color: #374151; line-height: 1.6;">
                                    ${data.recommendation}
                                </p>
                            </div>
                            
                            <!-- CTA Button -->
                            <div style="text-align: center; margin: 40px 0;">
                                <a href="${data.analysisUrl}" 
                                   style="display: inline-block; background-color: #1e40af; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: bold; font-size: 16px;">
                                    상세 분석 보기 →
                                </a>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 20px 30px; border-radius: 0 0 8px 8px; text-align: center;">
                            <p style="margin: 0; font-size: 14px; color: #6b7280;">
                                이 메일은 자동으로 발송되었습니다.<br>
                                알림 설정은 시스템 설정에서 변경할 수 있습니다.
                            </p>
                            <p style="margin: 10px 0 0; font-size: 12px; color: #9ca3af;">
                                © 2024 AI 기반 자치법규 영향 분석 시스템. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
  `.trim();
}

/**
 * Send daily digest email
 */
export async function sendDailyDigest(
  user: User,
  stats: {
    pending_reviews: number;
    urgent_count: number;
    new_today: number;
  },
  dbService: any,
  sendGridApiKey?: string
): Promise<{ success: boolean }> {
  if (!user.notification_settings.email_enabled || !sendGridApiKey) {
    return { success: false };
  }

  const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>일일 요약</title>
</head>
<body style="font-family: 'Malgun Gothic', sans-serif; padding: 20px; background-color: #f3f4f6;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; padding: 30px;">
        <h2 style="color: #1e40af; margin-bottom: 20px;">📊 일일 요약</h2>
        
        <p>안녕하세요, ${user.username}님</p>
        
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px; color: #374151;">오늘의 현황</h3>
            <ul style="list-style: none; padding: 0; margin: 0;">
                <li style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    <strong>검토 대기:</strong> ${stats.pending_reviews}건
                </li>
                <li style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    <strong>긴급 검토:</strong> ${stats.urgent_count}건
                </li>
                <li style="padding: 8px 0;">
                    <strong>신규 분석:</strong> ${stats.new_today}건
                </li>
            </ul>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
            <a href="https://law-analysis.go.kr/dashboard" 
               style="display: inline-block; background-color: #1e40af; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px;">
                대시보드 바로가기
            </a>
        </div>
    </div>
</body>
</html>
  `;

  const result = await sendEmail({
    to: user.email,
    subject: '[일일 요약] AI 자치법규 영향 분석 시스템',
    html
  }, sendGridApiKey);

  return result;
}
