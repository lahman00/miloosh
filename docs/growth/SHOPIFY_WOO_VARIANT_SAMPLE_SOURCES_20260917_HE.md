# מקורות לסבב וריאנטים מייצג — Shopify / WooCommerce

נבדק: 17 בספטמבר 2026.
היקף: חיזוק העמוד הקיים `/compare/shopify-vs-woocommerce` בלבד; אין עמוד חדש ואין טענת הגירה שבוצעה בפועל.

## Shopify — מעבר מ-WooCommerce
מקור רשמי: https://help.shopify.com/en/manual/migrating-to-shopify/migrating-from-woocommerce

המדריך ממפה `Attribute 1 name` ל-`Option1 Name` ו-`Attribute 1 value(s)` ל-`Option1 Value`.
כאשר בשדה WooCommerce יש כמה ערכי אפשרות, Shopify דורשת ליצור שורות נפרדות ולשמור ערך אפשרות אחד בכל שורה.
אותו מיפוי כולל גם Variant SKU, Variant Grams, Variant Inventory Qty, Variant Price ו-Image Src.
המדריך גם מזהיר שעמודת inventory quantity בקובץ המוצר מיועדת לחנות עם מיקום יחיד; בחנות מרובת מיקומים יש להשתמש ב-inventory CSV.

## WooCommerce — Product CSV Importer and Exporter
מקור רשמי: https://woocommerce.com/document/product-csv-importer-exporter/

WooCommerce מתעדת מבנה נפרד למוצר `variable` ולשורות `variation`.
לכל וריאציה צריך מזהה יציב/ייחודי כגון SKU, ושדה Parent מחבר את הילד למוצר האב לפי SKU או ID.
לשורות וריאציה יש ערכי attributes משלהן; במסלול הדוגמה מומלץ לגבות או לבדוק על staging ולבחון דגימה קטנה לפני יבוא מלא.

## גבולות הניסוח
לא נטען שכל וריאנט יעבור אוטומטית, לא נטען שכל שדה נתמך, ולא ניתנה הבטחת שימור מלאי, תמונות או SEO.
לא הומצאו מספר וריאנטים, זמן עבודה, מחיר הגירה או חיסכון.
מטרת התוספת היא להפוך "בדקתי שהמוצרים עברו" לבדיקת קבלה מייצגת שניתנת לאימות שדה-אחר-שדה.
