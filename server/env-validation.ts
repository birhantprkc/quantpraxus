export function validateEnvironmentVariables() {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (!process.env.OPENWEATHER_API_KEY) {
    warnings.push('⚠️  OPENWEATHER_API_KEY ayarlanmamış. Hava durumu özelliği çalışmayacak.');
  }

  if (!process.env.EMAIL_USER) {
    warnings.push('⚠️  EMAIL_USER ayarlanmamış. E-posta özellikleri çalışmayacak.');
  }

  if (!process.env.EMAIL_PASS) {
    warnings.push('⚠️  EMAIL_PASS ayarlanmamış. E-posta özellikleri çalışmayacak.');
  }
  
  if (!process.env.EMAIL_FROM) {
    warnings.push('⚠️  EMAIL_FROM ayarlanmamış. E-posta özellikleri çalışmayacak.');
  }

  if (warnings.length > 0) {
    console.log('\n🔔 Ortam Değişkeni Uyarıları:');
    warnings.forEach(warning => console.log(warning));
    console.log('📝 .env.example dosyasını .env olarak kopyalayın ve değerlerinizi doldurun.\n');
  }

  if (errors.length > 0) {
    console.error('\n❌ Kritik Ortam Değişkeni Hataları:');
    errors.forEach(error => console.error(error));
    console.error('Uygulama bu değişkenler olmadan başlatılamaz.\n');
    process.exit(1);
  }
}

export function safeGetEnv(key: string, fallback: string = ''): string {
  const value = process.env[key];
  return value || fallback;
}

