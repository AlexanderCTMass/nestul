// scripts/create-test-registry.js
const XLSX = require('xlsx');
const path = require('path');

// Данные для реестра
const registryData = [
    {
        company: 'ООО "МебельСтрой"',
        inn: '7701234567',
        ogrn: '1027700123456',
        regNumber: '10618244',
        productName: 'Стол письменный деревянный',
        okpd2: '31.01.12.120',
        okved2: '31.09',
        tnved: '940330',
        dateAdded: '2023-01-15',
        expiryDate: '2026-01-14',
        basis: 'Приказ №123 от 15.01.2023'
    },
    {
        company: 'ООО "МебельСтрой"',
        inn: '7701234567',
        ogrn: '1027700123456',
        regNumber: '10618255',
        productName: 'Шкаф для одежды офисный',
        okpd2: '31.01.12.130',
        okved2: '31.09',
        tnved: '940350',
        dateAdded: '2023-02-20',
        expiryDate: '2026-02-19',
        basis: 'Приказ №234 от 20.02.2023'
    },
    {
        company: 'ЗАО "ОфисКомплект"',
        inn: '7709876543',
        ogrn: '1037700987654',
        regNumber: '10690678',
        productName: 'Кресло офисное с металлическим каркасом',
        okpd2: '31.01.11.110',
        okved2: '31.01',
        tnved: '940131',
        dateAdded: '2023-03-10',
        expiryDate: '2026-03-09',
        basis: 'Приказ №345 от 10.03.2023'
    },
    {
        company: 'ЗАО "ОфисКомплект"',
        inn: '7709876543',
        ogrn: '1037700987654',
        regNumber: '10690685',
        productName: 'Стул офисный с деревянным каркасом',
        okpd2: '31.01.11.120',
        okved2: '31.01',
        tnved: '940161',
        dateAdded: '2023-04-05',
        expiryDate: '2026-04-04',
        basis: 'Приказ №456 от 05.04.2023'
    },
    {
        company: 'ООО "ТехноМебель"',
        inn: '7712345678',
        ogrn: '1047712345678',
        regNumber: '10690681',
        productName: 'Стеллаж металлический офисный',
        okpd2: '31.01.12.140',
        okved2: '31.09',
        tnved: '940320',
        dateAdded: '2023-05-12',
        expiryDate: '2026-05-11',
        basis: 'Приказ №567 от 12.05.2023'
    },
    {
        company: 'ООО "ТехноМебель"',
        inn: '7712345678',
        ogrn: '1047712345678',
        regNumber: '10618291',
        productName: 'Мебель металлическая бытовая',
        okpd2: '31.01.12.150',
        okved2: '31.09',
        tnved: '940320',
        dateAdded: '2023-06-18',
        expiryDate: '2026-06-17',
        basis: 'Приказ №678 от 18.06.2023'
    },
    {
        company: 'ООО "ДеревоСтиль"',
        inn: '7723456789',
        ogrn: '1057723456789',
        regNumber: '10618249',
        productName: 'Полка навесная офисная',
        okpd2: '31.01.12.160',
        okved2: '31.09',
        tnved: '940360',
        dateAdded: '2023-07-22',
        expiryDate: '2026-07-21',
        basis: 'Приказ №789 от 22.07.2023'
    },
    {
        company: 'ООО "ДеревоСтиль"',
        inn: '7723456789',
        ogrn: '1057723456789',
        regNumber: '10618241',
        productName: 'Стол журнальный',
        okpd2: '31.01.12.170',
        okved2: '31.09',
        tnved: '940340',
        dateAdded: '2023-08-30',
        expiryDate: '2026-08-29',
        basis: 'Приказ №890 от 30.08.2023'
    },
    {
        company: 'ООО "КухниПро"',
        inn: '7734567890',
        ogrn: '1067734567890',
        regNumber: '10618317',
        productName: 'Кухонный гарнитур',
        okpd2: '31.02.10.110',
        okved2: '31.02',
        tnved: '940340',
        dateAdded: '2023-09-14',
        expiryDate: '2026-09-13',
        basis: 'Приказ №901 от 14.09.2023'
    },
    {
        company: 'ООО "АрхивСистем"',
        inn: '7745678901',
        ogrn: '1077745678901',
        regNumber: '10618267',
        productName: 'Шкаф архивный металлический',
        okpd2: '31.01.12.180',
        okved2: '31.09',
        tnved: '940320',
        dateAdded: '2023-10-25',
        expiryDate: '2026-10-24',
        basis: 'Приказ №012 от 25.10.2023'
    }
];

// Создаем массив для Excel с заголовками
const excelData = [
    ['Наименование организации', 'ИНН', 'ОГРН', 'Реестровый номер', 'Наименование продукции',
        'Код ОКПД2', 'Код ОКВЭД2', 'Код ТН ВЭД', 'Дата включения', 'Дата исключения', 'Основание']
];

registryData.forEach(item => {
    excelData.push([
        item.company,
        item.inn,
        item.ogrn,
        item.regNumber,
        item.productName,
        item.okpd2,
        item.okved2,
        item.tnved,
        item.dateAdded,
        item.expiryDate,
        item.basis
    ]);
});

// Создаем workbook
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet(excelData);

// Настраиваем ширину колонок
ws['!cols'] = [
    { wch: 30 }, // Наименование организации
    { wch: 15 }, // ИНН
    { wch: 20 }, // ОГРН
    { wch: 15 }, // Реестровый номер
    { wch: 40 }, // Наименование продукции
    { wch: 15 }, // Код ОКПД2
    { wch: 12 }, // Код ОКВЭД2
    { wch: 15 }, // Код ТН ВЭД
    { wch: 15 }, // Дата включения
    { wch: 15 }, // Дата исключения
    { wch: 40 }  // Основание
];

XLSX.utils.book_append_sheet(wb, ws, 'Продукция');
XLSX.writeFile(wb, path.join(__dirname, '../test-registry.xlsx'));

console.log('✅ Файл реестра создан: test-registry.xlsx');
console.log(`📊 Добавлено записей: ${registryData.length}`);