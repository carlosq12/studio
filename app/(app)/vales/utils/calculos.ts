import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export type MarcacionRow = {
  acNo: string;
  nombre: string;
  horario: string;
  estado: string;
};

export type FuncionarioInfo = {
  acNo: string;
  nombre: string;
  jornadaTipo: "normal" | "turno" | "desconocido";
  rut?: string;
};

// Utils function to parse standard "DD/MM/YYYY HH:MM a. m." from Sheets to standard Date
export function parseHorarioTS(str: string | Date | number): Date | null {
  if (str instanceof Date) return str;
  if (!str) return null;
  let s = String(str).trim();
  
  // Try to parse basic Excel serial dates
  if (!isNaN(Number(s)) && !s.includes('/')) {
     const excelEpoch = new Date(1899, 11, 30);
     const ms = Number(s) * 86400000;
     const d = new Date(excelEpoch.getTime() + ms);
     return d;
  }

  // Attempt to parse formats like "25/02/2026 07:56 p. m."
  s = s.replace(/a\. m\./i, "AM").replace(/p\. m\./i, "PM");
  s = s.replace(/a\.m\./i, "AM").replace(/p\.m\./i, "PM");
  
  const tokens = s.split(" ");
  if (tokens.length < 3) {
    // try to split by 'T' if it's ISO or just standard JS Date fallback
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) return parsed;
    // try DD/MM/YYYY if no time
    if(tokens.length === 1 && s.includes('/')) {
       const dateTokens = s.split("/");
       if (dateTokens.length === 3) {
           let [day, month, year] = dateTokens;
           if (year.length < 4 && year.length === 2) year = "20" + year;
           const dNoTime = new Date(`${month}/${day}/${year}`);
           if (!isNaN(dNoTime.getTime())) return dNoTime;
       }
    }
    return null;
  }
  
  const dateTokens = tokens[0].split("/");
  if(dateTokens.length !== 3) {
     const parsed = new Date(s);
     return isNaN(parsed.getTime()) ? null : parsed;
  }

  let [day, month, year] = dateTokens;
  const [time, ampm] = [tokens[1], tokens[2]];
  
  if (year.length < 4 && year.length === 2) {
     year = "20" + year;
  }

  // MM/DD/YYYY format for safer parsing
  const formattedStr = `${month}/${day}/${year} ${time} ${ampm}`;
  const d = new Date(formattedStr);
  return isNaN(d.getTime()) ? null : d;
}

export type JornadaResult = {
  acNo: string;
  nombre: string;
  jornadaTipo: string;
  jornadasValidas: number;
  errores: string[];
  noMarcajes: number;
  detalles?: { horario: string; estado: string }[];
};

export function calcularJornadasAvanzado(
  marcaciones: MarcacionRow[], 
  funcionarios: Record<string, FuncionarioInfo>
): JornadaResult[] {
  
  // Agrupar
  const agrupado: Record<string, typeof marcaciones> = {};
  for(const row of marcaciones) {
     if(!row.acNo) continue;
     if(!agrupado[row.acNo]) agrupado[row.acNo] = [];
     agrupado[row.acNo].push(row);
  }
  
  const resultados: JornadaResult[] = [];
  
  for(const ac in agrupado) {
    const registros = agrupado[ac];
    let jornadasValidas = 0;
    const errores: string[] = [];
    let noMarcajes = 0;
    
    // Look up in dict, otherwise infer from records
    const info = funcionarios[ac];
    const jornadaTipo = info?.jornadaTipo || "desconocido";
    const nombre = info?.nombre || registros[0]?.nombre || "Sin nombre";
    // Si no sabemos la jornada, fallback a 8
    const minimoHoras = jornadaTipo === "normal" ? 6 : 8; 
    
    // Sort chronologically
    registros.sort((a,b) => {
       const da = parseHorarioTS(a.horario);
       const db = parseHorarioTS(b.horario);
       if(!da || !db) return 0;
       return da.getTime() - db.getTime();
    });
    
    let esperandoEntrada: Date | null = null;
    
    for(const reg of registros) {
      const fecha = parseHorarioTS(reg.horario);
      if(!fecha) continue;
      
      const estado = String(reg.estado || "").trim().toLowerCase();
      
      if(estado === "m/ent") {
         esperandoEntrada = fecha;
      } else if (estado === "m/sal" && esperandoEntrada) {
         const horasTrabajadas = (fecha.getTime() - esperandoEntrada.getTime()) / (1000 * 60 * 60);
         const mismoDia = fecha.toDateString() === esperandoEntrada.toDateString();
         
         if(jornadaTipo === "normal") {
           // Normal constraint 
           if(!mismoDia && horasTrabajadas < minimoHoras) {
             errores.push(`${esperandoEntrada.toLocaleDateString("es-CL")} jornada cruzada inválida (${horasTrabajadas.toFixed(1)}h)`);
             noMarcajes++;
             esperandoEntrada = null;
             continue; // go to next
           }
         } else if (jornadaTipo === "turno" || jornadaTipo === "desconocido") {
           // Turno constraint
           if (horasTrabajadas > 36) {
             errores.push(`${esperandoEntrada.toLocaleDateString("es-CL")} entrada sin salida válida`);
             noMarcajes++;
             esperandoEntrada = null;
             continue;
           }
         }
         
         if (horasTrabajadas >= minimoHoras) {
           jornadasValidas++;
         } else {
           errores.push(`${esperandoEntrada.toLocaleDateString("es-CL")} jornada menor a ${minimoHoras}h (${horasTrabajadas.toFixed(1)}h)`);
         }
         
         esperandoEntrada = null;
      }
    }
    
    if (esperandoEntrada) {
      errores.push(`${esperandoEntrada.toLocaleDateString("es-CL")} falta salida`);
      noMarcajes++;
    }
    
    resultados.push({
      acNo: ac,
      nombre,
      jornadaTipo,
      jornadasValidas,
      errores,
      noMarcajes,
      detalles: registros.map(r => {
        const d = parseHorarioTS(r.horario);
        return { 
          horario: d ? format(d, "EEEE dd MMM yyyy|HH:mm", { locale: es }) : String(r.horario), 
          estado: r.estado 
        };
      })
    });
  }

  // Sort by name
  resultados.sort((a,b) => a.nombre.localeCompare(b.nombre));

  return resultados;
}

export function exportToExcel(data: any[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Resultados");
  XLSX.writeFile(wb, filename);
}
