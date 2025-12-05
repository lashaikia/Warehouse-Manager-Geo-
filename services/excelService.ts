import { ScannedItem } from './aiScanner';

declare var XLSX: any;

export const parseExcelFile = async (file: File): Promise<ScannedItem[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });

        // 1. Strict Validation: Single Sheet Check
        if (workbook.SheetNames.length > 1) {
          reject(new Error("ფაილი შეიცავს ერთზე მეტ ტაბს (Sheet). გთხოვთ დატოვოთ მხოლოდ ერთი ცხრილი ერთ გვერდზე და სცადოთ თავიდან."));
          return;
        }

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Basic Heuristic Mapping (Assumption: Headers are in the first row)
        // Note: Real-world excel parsing might need more sophisticated header detection
        if (jsonData.length < 2) {
             reject(new Error("ფაილი ცარიელია ან არასწორი ფორმატის."));
             return;
        }

        const headers = (jsonData[0] as string[]).map(h => h.toString().toLowerCase().trim());
        const rows = jsonData.slice(1);

        const items: ScannedItem[] = rows.map((row: any[]) => {
            // Helper to find index by keywords
            const findIdx = (keywords: string[]) => headers.findIndex(h => keywords.some(k => h.includes(k)));

            const nomIdx = findIdx(['code', 'id', 'კოდი', 'ნომენკლატურა', 'sku']);
            const nameIdx = findIdx(['name', 'desc', 'დასახელება', 'პროდუქტი']);
            const qtyIdx = findIdx(['qty', 'amount', 'count', 'რაოდენობა', 'ნაშთი']);
            const unitIdx = findIdx(['unit', 'dim', 'ზომა', 'ერთეული']);

            // Default mappings if headers aren't clear (fallback to column 0, 1, 2)
            const nomenclature = nomIdx !== -1 ? row[nomIdx] : (row[0] || '');
            const name = nameIdx !== -1 ? row[nameIdx] : (row[1] || '');
            const quantity = qtyIdx !== -1 ? parseFloat(row[qtyIdx]) : (parseFloat(row[2]) || 0);
            const rawUnit = unitIdx !== -1 ? row[unitIdx] : (row[3] || 'pcs');

            // Normalize Unit
            let unit = 'pcs';
            if (rawUnit) {
                const uStr = rawUnit.toString().toLowerCase();
                if (uStr.includes('kg') || uStr.includes('კგ')) unit = 'kg';
                else if (uStr.includes('m') || uStr.includes('მ')) unit = 'm';
                else if (uStr.includes('l') || uStr.includes('ლ')) unit = 'l';
            }

            return {
                nomenclature: nomenclature?.toString() || '',
                name: name?.toString() || '',
                quantity: quantity || 0,
                unit
            };
        }).filter(item => item.name || item.nomenclature); // Filter out completely empty rows

        resolve(items);

      } catch (err) {
        console.error("Excel parse error", err);
        reject(new Error("ფაილის დამუშავება ვერ მოხერხდა. დარწმუნდით რომ ფაილი არ არის დაზიანებული."));
      }
    };

    reader.onerror = () => reject(new Error("ფაილის წაკითხვა ვერ მოხერხდა"));
    reader.readAsBinaryString(file);
  });
};