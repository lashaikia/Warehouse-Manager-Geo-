
import { ScannedItem } from './aiScanner';

declare var XLSX: any;

export const parseExcelFile = async (file: File): Promise<ScannedItem[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });

        if (workbook.SheetNames.length > 1) {
          reject(new Error("ფაილი შეიცავს ერთზე მეტ ტაბს. გთხოვთ დატოვოთ მხოლოდ ერთი ცხრილი."));
          return;
        }

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON with array of arrays (header: 1)
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length < 2) {
             reject(new Error("ფაილი ცარიელია ან არასწორი ფორმატის."));
             return;
        }

        // Updated Logic for column order:
        // Col 0: No (Index)
        // Col 1: Category (e.g. 16.28)
        // Col 2: Warehouse (e.g. N4) <-- NEW
        // Col 3: Name (Description)
        // Col 4: Code (Nomenclature)
        // Col 5: Unit (e.g. ცალი)
        // Col 6: Quantity (e.g. 129)
        
        const rows = jsonData.slice(1);

        const items: ScannedItem[] = rows.map((row: any[]) => {
            const category = row[1] ? String(row[1]).trim() : '';
            const warehouse = row[2] ? String(row[2]).trim() : ''; // New field
            const name = row[3] ? String(row[3]).trim() : '';
            const nomenclature = row[4] ? String(row[4]).trim() : '';
            const unit = row[5] ? String(row[5]).trim() : 'ცალი';
            const quantity = row[6] ? parseFloat(row[6]) : 0;

            return {
                nomenclature,
                name,
                category,
                warehouse,
                quantity,
                unit
            };
        }).filter(item => item.name || item.nomenclature);

        resolve(items);

      } catch (err) {
        console.error("Excel parse error", err);
        reject(new Error("ფაილის დამუშავება ვერ მოხერხდა."));
      }
    };

    reader.onerror = () => reject(new Error("ფაილის წაკითხვა ვერ მოხერხდა"));
    reader.readAsBinaryString(file);
  });
};
