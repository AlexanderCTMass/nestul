const fs = require('fs');
const path = require('path');

// Конфигурация
const CONFIG = {
    // Папки для исключения
    excludeDirs: [
        'node_modules',
        '.next',
        'out',
        'build',
        'dist',
        '.git',
        '.idea',
        '.vscode',
        'coverage',
        '.cache',
        'next'
    ],
    // Файлы для исключения
    excludeFiles: [
        'package-lock.json',
        'yarn.lock',
        'pnpm-lock.yaml',
        '.gitignore',
        '.env',
        '.env.local',
        '.env.development',
        '.env.production',
        'next-env.d.ts',
        'tsconfig.tsbuildinfo'
    ],
    // Расширения файлов для включения
    includeExtensions: [
        '.js', '.jsx', '.ts', '.tsx',
        '.css', '.scss', '.module.css', '.module.scss',
        '.json', '.md', '.mdx',
        '.html', '.xml',
        '.env.example'
    ],
    // Максимальный размер файла для чтения (5MB)
    maxFileSize: 5 * 1024 * 1024
};

// Функция проверки нужно ли исключить директорию
function shouldExcludeDir(dirName) {
    return CONFIG.excludeDirs.includes(dirName);
}

// Функция проверки нужно ли исключить файл
function shouldExcludeFile(fileName) {
    return CONFIG.excludeFiles.includes(fileName);
}

// Функция проверки расширения файла
function shouldIncludeFile(fileName) {
    const ext = path.extname(fileName);
    return CONFIG.includeExtensions.includes(ext);
}

// Функция генерации древовидной структуры
function generateTreeStructure(dir, prefix = '', isLast = true, excludeDirs = CONFIG.excludeDirs) {
    let tree = '';
    const items = fs.readdirSync(dir)
        .filter(item => !shouldExcludeDir(item))
        .sort((a, b) => {
            const aIsDir = fs.statSync(path.join(dir, a)).isDirectory();
            const bIsDir = fs.statSync(path.join(dir, b)).isDirectory();
            if (aIsDir && !bIsDir) return -1;
            if (!aIsDir && bIsDir) return 1;
            return a.localeCompare(b);
        });

    items.forEach((item, index) => {
        const itemPath = path.join(dir, item);
        const isLastItem = index === items.length - 1;
        const stats = fs.statSync(itemPath);

        tree += prefix + (isLast ? '└── ' : '├── ') + item;

        if (stats.isDirectory()) {
            tree += '/\n';
            const newPrefix = prefix + (isLast ? '    ' : '│   ');
            tree += generateTreeStructure(itemPath, newPrefix, isLastItem);
        } else {
            tree += '\n';
        }
    });

    return tree;
}

// Функция сбора содержимого файлов
function collectFilesContent(dir, baseDir = dir) {
    let content = '';
    const items = fs.readdirSync(dir);

    for (const item of items) {
        if (shouldExcludeDir(item)) continue;

        const itemPath = path.join(dir, item);
        const stats = fs.statSync(itemPath);
        const relativePath = path.relative(baseDir, itemPath);

        if (stats.isDirectory()) {
            content += collectFilesContent(itemPath, baseDir);
        } else {
            if (!shouldExcludeFile(item) && shouldIncludeFile(item)) {
                const fileSize = stats.size;

                if (fileSize > CONFIG.maxFileSize) {
                    content += `\n${'='.repeat(80)}\n`;
                    content += `Файл: ${relativePath}\n`;
                    content += `${'='.repeat(80)}\n`;
                    content += `[Файл слишком большой (${(fileSize / 1024 / 1024).toFixed(2)} MB), содержимое пропущено]\n\n`;
                    continue;
                }

                try {
                    const fileContent = fs.readFileSync(itemPath, 'utf8');
                    content += `\n${'='.repeat(80)}\n`;
                    content += `Файл: ${relativePath}\n`;
                    content += `${'='.repeat(80)}\n`;
                    content += fileContent;
                    content += `\n${'='.repeat(80)}\n\n`;
                } catch (error) {
                    content += `\n${'='.repeat(80)}\n`;
                    content += `Файл: ${relativePath}\n`;
                    content += `${'='.repeat(80)}\n`;
                    content += `[Ошибка чтения файла: ${error.message}]\n\n`;
                }
            }
        }
    }

    return content;
}

// Основная функция
function analyzeProject() {
    const projectPath = process.cwd();
    const outputFile = path.join(projectPath, 'project-analysis.txt');

    console.log('🚀 Начинаем анализ проекта Next.js...\n');

    // Генерация структуры
    console.log('📁 Сбор структуры проекта...');
    let output = '';
    output += '='.repeat(80) + '\n';
    output += 'СТРУКТУРА ПРОЕКТА NEXT.JS\n';
    output += '='.repeat(80) + '\n\n';
    output += `${path.basename(projectPath)}/\n`;
    output += generateTreeStructure(projectPath);
    output += '\n\n';

    // Сбор содержимого файлов
    console.log('📄 Сбор содержимого файлов...');
    output += '='.repeat(80) + '\n';
    output += 'СОДЕРЖИМОЕ ФАЙЛОВ\n';
    output += '='.repeat(80) + '\n';
    output += collectFilesContent(projectPath);

    // Запись в файл
    try {
        fs.writeFileSync(outputFile, output, 'utf8');
        const stats = fs.statSync(outputFile);
        const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);

        console.log(`\n✅ Готово! Файл создан: ${outputFile}`);
        console.log(`📊 Размер файла: ${fileSizeMB} MB`);
        console.log(`\n💡 Вы можете загрузить этот файл мне для анализа проекта.`);

        // Дополнительная информация
        const fileCount = (output.match(/Файл: /g) || []).length;
        console.log(`📝 Всего обработано файлов: ${fileCount}`);

    } catch (error) {
        console.error('❌ Ошибка при записи файла:', error.message);
    }
}

// Запуск анализа
try {
    analyzeProject();
} catch (error) {
    console.error('❌ Критическая ошибка:', error.message);
    console.log('\n📌 Убедитесь, что вы запускаете скрипт из корневой директории вашего Next.js проекта.');
}