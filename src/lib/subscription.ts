import { SubscriptionStatus } from './types';

export const MASTER_KEY = 'BILLSAATHI2024';

export function getSubscriptionStatus(endDate: string): SubscriptionStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) return { status: 'expired', color: '#9e9e9e', label: 'Expired', daysLeft };
  if (daysLeft <= 7) return { status: 'critical', color: '#f44336', label: `${daysLeft} din bache`, daysLeft };
  if (daysLeft <= 30) return { status: 'warning', color: '#ff9800', label: `${daysLeft} din bache`, daysLeft };
  return { status: 'active', color: '#4caf50', label: `${daysLeft} din bache`, daysLeft };
}

export function addDuration(startDate: string, duration: string): string {
  const date = new Date(startDate);
  switch (duration) {
    case '1month': date.setDate(date.getDate() + 30); break;
    case '3months': date.setDate(date.getDate() + 90); break;
    case '6months': date.setDate(date.getDate() + 180); break;
    case '1year': date.setDate(date.getDate() + 365); break;
  }
  return date.toISOString().split('T')[0];
}

const HINDI_MONTHS = ['जनवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितम्बर', 'अक्टूबर', 'नवम्बर', 'दिसम्बर'];
const ENGLISH_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const ENGLISH_MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Format date based on language setting.
 * - English/Gujarati/Hinglish: English format
 * - Hindi: Hindi month names
 */
export function formatDate(dateStr: string, language?: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  
  const day = d.getDate();
  const month = d.getMonth();
  const year = d.getFullYear();
  
  const lang = language || localStorage.getItem('bs_language') || 'hi';
  
  if (lang === 'hi') {
    return `${day} ${HINDI_MONTHS[month]} ${year}`;
  }
  
  // English, Hinglish, Gujarati all use English format
  return `${day} ${ENGLISH_MONTHS[month]} ${year}`;
}

export function formatDateShort(dateStr: string, language?: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  
  const day = d.getDate();
  const month = d.getMonth();
  const year = d.getFullYear();
  
  const lang = language || localStorage.getItem('bs_language') || 'hi';
  
  if (lang === 'hi') {
    return `${day} ${HINDI_MONTHS[month].substring(0, 3)} ${year}`;
  }
  
  return `${ENGLISH_MONTHS_SHORT[month]} ${day}, ${year}`;
}

export function numberToWords(num: number): string {
  if (num === 0) return 'Zero';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  if (num < 20) return ones[num];
  if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
  if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + numberToWords(num % 100) : '');
  if (num < 100000) return numberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + numberToWords(num % 1000) : '');
  if (num < 10000000) return numberToWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + numberToWords(num % 100000) : '');
  return numberToWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + numberToWords(num % 10000000) : '');
}
