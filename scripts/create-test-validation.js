// scripts/create-test-validation.js
const XLSX = require('xlsx');
const path = require('path');

// Сценарии для тестирования
const testScenarios = [
    {
        // Сценарий 1: Полное совпадение
        name: 'Сценарий 1: Полное совпадение',
        okpd2: '31.01.12.120',
        okved2: '31.09',
        requirementType: 'Ограничение',
        country: 'Россия',
        reestrNumber: '10618244',
        productNameReestr: 'Стол письменный деревянный',
        productNameTZ: 'Стол письменный деревянный',
        expectedResult: 'valid'
    },
    {
        // Сценарий 2: Совпадение с небольшими отличиями в названии
        name: 'Сценарий 2: Синонимичное название',
        okpd2: '31.01.12.130',
        okved2: '31.09',
        requirementType: 'Ограничение',
        country: 'Россия',
        reestrNumber: '10618255',
        productNameReestr: 'Шкаф для одежды офисный',
        productNameTZ: 'Шкаф офисный для одежды',
        expectedResult: 'warning'
    },
    {
        // Сценарий 3: Разные ОКПД2
        name: 'Сценарий 3: Номер найден, но ОКПД2 различается',
        okpd2: '32.99.53.130',
        okved2: '31.09',
        requirementType: 'Ограничение',
        country: 'Россия',
        reestrNumber: '10618244',
        productNameReestr: 'Стол письменный деревянный',
        productNameTZ: 'Стол письменный',
        expectedResult: 'warning'
    },
    {
        // Сценарий 4: Номер не найден в реестре
        name: 'Сценарий 4: Номер не найден',
        okpd2: '31.01.11.110',
        okved2: '31.01',
        requirementType: 'Ограничение',
        country: 'Россия',
        reestrNumber: '99999999',
        productNameReestr: 'Несуществующий товар',
        productNameTZ: 'Кресло офисное',
        expectedResult: 'invalid'
    },
    {
        // Сценарий 5: Без реестрового номера при требовании
        name: 'Сценарий 5: Отсутствует реестровый номер при требовании',
        okpd2: '31.01.11.120',
        okved2: '31.01',
        requirementType: 'Ограничение',
        country: 'Россия',
        reestrNumber: '',
        productNameReestr: '',
        productNameTZ: 'Стул офисный',
        expectedResult: 'warning'
    },
    {
        // Сценарий 6: Похожее название (нечеткое совпадение)
        name: 'Сценарий 6: Похожее название (нужен NLP)',
        okpd2: '31.01.12.140',
        okved2: '31.09',
        requirementType: 'Ограничение',
        country: 'Россия',
        reestrNumber: '',
        productNameReestr: 'Стеллаж металлический офисный',
        productNameTZ: 'Стеллаж из металла для офиса',
        expectedResult: 'warning'
    },
    {
        // Сценарий 7: Совпадение по названию, разный ОКПД2
        name: 'Сценарий 7: Совпадение по названию, но разный ОКПД2',
        okpd2: '31.02.10.110',
        okved2: '31.02',
        requirementType: 'Ограничение',
        country: 'Россия',
        reestrNumber: '10618317',
        productNameReestr: 'Кухонный гарнитур',
        productNameTZ: 'Кухонный гарнитур угловой',
        expectedResult: 'warning'
    },
    {
        // Сценарий 8: Без требований (не требуется проверка)
        name: 'Сценарий 8: Без требований',
        okpd2: '31.01.12.150',
        okved2: '31.09',
        requirementType: 'Без ограничений',
        country: 'Китай',
        reestrNumber: '',
        productNameReestr: '',
        productNameTZ: 'Мебель металлическая',
        expectedResult: 'not_required'
    },
    {
        // Сценарий 9: Просроченная запись
        name: 'Сценарий 9: Запись с истекшим сроком действия',
        okpd2: '31.01.12.160',
        okved2: '31.09',
        requirementType: 'Ограничение',
        country: 'Россия',
        reestrNumber: '10618249',
        productNameReestr: 'Полка навесная офисная',
        productNameTZ: 'Полка для документов настенная',
        expectedResult: 'warning'
    },
    {
        // Сценарий 10: Товар из реестра без номера в заявке
        name: 'Сценарий 10: Товар из реестра, но номер не указан',
        okpd2: '31.01.12.170',
        okved2: '31.09',
        requirementType: 'Ограничение',
        country: 'Россия',
        reestrNumber: '',
        productNameReestr: 'Стол журнальный',
        productNameTZ: 'Столик журнальный',
        expectedResult: 'warning'
    }
];

// Создаем заголовки для Excel (как в реальной заявке)
const excelData = [
    ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'],
    ['Участник', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['№ п/п', 'Наименование товара (работы, услуги)', 'Ед. изм.', 'Кол-во', 'Код ОКПД2', 'Код ОКВЭД2',
        'Требование ПП РФ 1875', 'Страна происхождения', 'Реестровый номер', 'Наименование в Реестре',
        'Наименование в ТЗ (уточненное)', 'Цена', 'Стоимость', 'Ставка НДС']
];

testScenarios.forEach((scenario, index) => {
    excelData.push([
        (index + 1).toString(),
        scenario.productNameTZ,
        'шт',
        '10',
        scenario.okpd2,
        scenario.okved2,
        scenario.requirementType,
        scenario.country,
        scenario.reestrNumber,
        scenario.productNameReestr,
        scenario.productNameTZ,
        '5000',
        '50000',
        '20%'
    ]);
});

// Создаем workbook
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet(excelData);

// Настраиваем ширину колонок
ws['!cols'] = [
    { wch: 8 },   // № п/п
    { wch: 40 },  // Наименование товара
    { wch: 8 },   // Ед. изм.
    { wch: 8 },   // Кол-во
    { wch: 15 },  // Код ОКПД2
    { wch: 12 },  // Код ОКВЭД2
    { wch: 25 },  // Требование
    { wch: 15 },  // Страна
    { wch: 15 },  // Реестровый номер
    { wch: 40 },  // Наименование в Реестре
    { wch: 40 },  // Наименование в ТЗ
    { wch: 12 },  // Цена
    { wch: 12 },  // Стоимость
    { wch: 10 }   // НДС
];

XLSX.utils.book_append_sheet(wb, ws, 'Лист1');
XLSX.writeFile(wb, path.join(__dirname, '../test-validation.xlsx'));

console.log('✅ Файл для валидации создан: test-validation.xlsx');
console.log(`📊 Добавлено сценариев: ${testScenarios.length}`);
console.log('\n📋 Ожидаемые результаты:');
testScenarios.forEach((scenario, index) => {
    console.log(`  ${index + 1}. ${scenario.name} -> ${scenario.expectedResult}`);
});