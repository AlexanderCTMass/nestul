// scripts/create-test-files.js
const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Создание тестовых файлов...\n');

try {
    // Создаем файл реестра
    console.log('📦 Создание файла реестра...');
    require('./create-test-registry');

    console.log('\n');

    // Создаем файл для валидации
    console.log('🔍 Создание файла для валидации...');
    require('./create-test-validation');

    console.log('\n✅ Все тестовые файлы созданы!');
    console.log('\n📁 Файлы находятся в корне проекта:');
    console.log('   - test-registry.xlsx - для загрузки в реестр');
    console.log('   - test-validation.xlsx - для тестирования сверки');
    console.log('\n📝 Инструкция:');
    console.log('   1. Загрузите test-registry.xlsx через админку');
    console.log('   2. Загрузите test-validation.xlsx через форму проверки');
    console.log('   3. Проверьте результаты для каждого сценария');
} catch (error) {
    console.error('❌ Ошибка:', error.message);
}