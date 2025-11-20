// Parse regulations Excel file
import XLSX from 'xlsx';
import { readFileSync } from 'fs';

const filePath = '/home/user/uploaded_files/자치법규목록 (1).xls';

console.log('📄 Reading Excel file...\n');

// Read the file
const workbook = XLSX.readFile(filePath);

// Get first sheet
const sheetName = workbook.SheetNames[0];
console.log('📋 Sheet name:', sheetName);

const worksheet = workbook.Sheets[sheetName];

// Convert to JSON
const data = XLSX.utils.sheet_to_json(worksheet);

console.log('\n📊 Total records:', data.length);
console.log('\n🔍 Sample record (first row):');
console.log(JSON.stringify(data[0], null, 2));

console.log('\n📋 Column names:');
if (data.length > 0) {
  console.log(Object.keys(data[0]).join(', '));
}

// Show statistics
console.log('\n📈 Data statistics:');
const stats = {};
Object.keys(data[0] || {}).forEach(key => {
  const uniqueValues = new Set(data.map(row => row[key])).size;
  stats[key] = {
    unique: uniqueValues,
    sample: data[0][key]
  };
});
console.log(JSON.stringify(stats, null, 2));

// Show first 5 records
console.log('\n📝 First 5 records:');
data.slice(0, 5).forEach((row, index) => {
  console.log(`\n--- Record ${index + 1} ---`);
  console.log(JSON.stringify(row, null, 2));
});
