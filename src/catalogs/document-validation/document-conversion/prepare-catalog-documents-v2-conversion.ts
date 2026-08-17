import { parseCatalogDocumentV1 } from '../catalog-document-v1.parser';
import {
  type CatalogLocale,
  type CatalogDocumentV2,
} from '../catalog-document-v2.schema';
import { convertCatalogDocumentV1ToV2 } from '../convert-catalog-document-v1-to-v2';

type StoredCatalog = {
  id: string;
  document: unknown;
};

type CatalogLocaleMapping = Readonly<Record<string, CatalogLocale>>;

type PreparedCatalogDocument = {
  id: string;
  document: CatalogDocumentV2;
};

export function prepareCatalogDocumentsV2Conversion(
  catalogs: readonly StoredCatalog[],
  localeMapping: CatalogLocaleMapping,
): PreparedCatalogDocument[] {
  return catalogs.map((catalog) => {
    const locale = localeMapping[catalog.id];
    if (!locale) {
      throw new Error(`Locale was not set for ${catalog.id}`);
    }
    const parsedV1 = parseCatalogDocumentV1(catalog.document);
    const convertedDocument = convertCatalogDocumentV1ToV2(parsedV1, locale);
    return {
      id: catalog.id,
      document: convertedDocument,
    };
  });
}
// ## Что делает функция
//
// Для каждого каталога:
//
// 1. Получает locale через:
//
// const locale = localeMapping[catalog.id];
//
// 2. Если locale отсутствует — выбрасывает понятную ошибку с catalog ID.
// 3. Проверяет catalog.document через parseCatalogDocumentV1.
// 4. Вызывает convertCatalogDocumentV1ToV2.
// 5. Возвращает:
//
// {
//   id: catalog.id,
//   document: convertedDocument,
// }
//
// Эта функция:
//
// - не подключается к БД;
// - не читает файлы;
// - ничего не записывает;
// - не выводит данные в консоль.
//
// ## Шаг 2. Unit-тесты
//
// Создай независимый тест:
//
// test/unit/catalogs/document-conversion/
//   prepare-catalog-documents-v2-conversion.unit-spec.ts
//
// Проверь:
//
// - несколько v1-каталогов преобразуются;
// - каждому назначается свой locale;
// - ID строки сохраняется;
// - отсутствие locale вызывает ошибку с ID;
// - повреждённый v1 вызывает validation error;
// - v2 или неизвестная версия не принимается;
// - исходные строки и mapping не мутируются;
// - порядок каталогов сохраняется.
//
// После этого остановись и проверь функцию самостоятельно. Потом я проведу review.
//
// ## Шаг 3. Read-only CLI
//
// После чистой функции добавим файл команды:
//
// src/scripts/convert-catalog-documents-v1-to-v2.ts
//
// Он будет:
//
// 1. Получать путь mapping-файла из аргумента.
// 2. Читать и разбирать JSON.
// 3. Подключаться к PostgreSQL.
// 4. Читать id и document из catalogs.
// 5. Вызывать подготовленную чистую функцию.
// 6. Печатать ID успешно проверенных каталогов.
// 7. Закрывать соединение.
//
// На этом этапе никаких UPDATE.
//
// ## Шаг 4. Режим записи
//
// Только после проверки dry run:
//
// - добавить явный флаг записи;
// - открыть транзакцию;
// - повторно прочитать каталоги внутри неё;
// - подготовить все преобразования;
// - выполнить UPDATE;
// - commit только после успешной обработки всех записей;
// - rollback при любой ошибке.
