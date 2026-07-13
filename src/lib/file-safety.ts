/**
 * Клиентская «антивирусная» заглушка: блок опасных расширений
 * (полноценный scan — ClamAV/edge, см. миграцию 008)
 */
const BLOCKED_EXT = new Set([
  '.exe',
  '.bat',
  '.cmd',
  '.com',
  '.msi',
  '.scr',
  '.js',
  '.vbs',
  '.ps1',
  '.sh',
  '.dll',
  '.jar',
  '.apk',
]);

export function assertSafeUpload(file: File): void {
  const name = file.name.toLowerCase();
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')) : '';
  if (BLOCKED_EXT.has(ext)) {
    throw new Error(
      `Файл «${file.name}» заблокирован политикой безопасности (расширение ${ext}).`
    );
  }
  // Пустые / подозрительно названные
  if (!file.name.trim() || file.name.includes('..')) {
    throw new Error('Некорректное имя файла');
  }
}
