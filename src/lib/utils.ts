type ColumnType = 'numeric' | 'categorical' | 'date' | 'boolean' | 'unknown';
type DataRow = Record<string, string | number | boolean | null>;

export function detectColumnType(data: DataRow[], column: string): ColumnType {
    if (!data || data.length === 0) return 'unknown';
    
    const values = data.map(row => row[column]).filter(val => val !== null && val !== undefined);
    if (values.length === 0) return 'unknown';
    
    // Check if all values are numbers
    const allNumbers = values.every(val => !isNaN(Number(val)) && val !== '');
    if (allNumbers) return 'numeric';
    
    // Check if all values are dates
    const allDates = values.every(val => !isNaN(Date.parse(String(val))));
    if (allDates) return 'date';
    
    // Check if all values are boolean
    const allBooleans = values.every(val => 
      val === 'true' || val === 'false' || val === true || val === false
    );
    if (allBooleans) return 'boolean';
    
    // Default to categorical
    return 'categorical';
  }
