
export type Employee = {
  id: string;
  'FECHA DE INGRESO': string;
  RUT: string;
  'NOMBRE FUNCIONARIO': string;
  'APELLIDO PATERNO': string;
  'APELLIDO MATERNO': string;
  'UNIDAD O SERVICIO': string;
  ESTAMENTO: string;
  TITULO: string;
  JEFATURA: string;
  birthDate: string; // YYYY-MM-DD
  avatar: string;
  role: string;
  firstName: string;
  paternalLastName: string;
  maternalLastName?: string;
  phone?: string;
  birthPlace?: string;
  address?: string;
  email?: string;
  afp?: string;
  healthSystem?: string;
  bank?: string;
  accountType?: string;
  accountNumber?: string;
  isapreName?: string;
  status?: string;
  clockNumber?: string;
  emergencyContact?: { name: string; phone: string; };
  skills?: string[];
  currentWorkload?: number;
  availability?: string;
};

export type Birthday = {
  id: string;
  'nombre funcionario'?: string;
  'fecha nacimiento'?: any;
  correo?: string;
  role?: string;
  avatar?: string;
};

export type Task = {
  id: string;
  'nombre tarea': string;
  descripcion?: string;
  persona: string[] | string;
  fecha: string;
  hora: string;
  lugar?: string;
  'cantidad de reuniones'?: string;
  estado: 'Pendiente' | 'En Progreso' | 'Completada' | 'Atrasada';
  prioridad: 'Alta' | 'Media' | 'Baja';
  correo?: string;
  name?: string;
  assignedTo?: string;
  deadline?: string;
};

export type InventarioItem = {
  id: string;
  nombre: string;
  descripcion?: string;
  cantidad: number;
  stock?: string;
  ubicacion?: string;
  'fecha de ingreso'?: any;
  imagen?: string;
}

export type InventarioEquipo = {
  id: string;
  'nombre equipo': string;
  descripcion?: string;
  estado?: string;
  'ip equipo'?: string;
  'licencia office'?: string;
  'personal a cargo'?: string;
  serial: string;
  ubicacion?: string;
  imagen?: string;
  'fecha de ingreso'?: any;
};

export type Replacement = {
    id: string;
    'FECHA DE INGRESO DOC'?: any;
    NOMBRE?: string;
    MES?: string;
    CARGO?: string;
    FUNCIONES?: string;
    UNIDAD?: string;
    DESDE?: any;
    HASTA?: any;
    'NOMBRE REEMPLAZADO'?: string;
    MOTIVO?: string;
    OBSERVACION?: string;
    IMAGEN?: string;
    ESTADO?: string;
    'JEFE SERVICIO'?: string;
    CORREO?: string;
    ESTADO_R_NR?: string;
    'FECHA DEL AVISO'?: any;
    AÑO?: string;
    'NUMERO RES'?: string;
    archivadorId?: string;
    originalEmployeeId?: string;
    replacementEmployeeId?: string;
    date?: string;
    shift?: string;
    reason?: string;
    status?: string;
}

export type IngresoFuncionario = {
  id: string;
  FECHA_DE_INGRESO: any;
  RUT: string;
  NOMBRES?: string;
  'APELLIDO P'?: string;
  'APELLIDO M'?: string;
  TELEFONO?: string;
  FECHA_DE_NACIMIENTO: any;
  LUGAR_NACIMIENTO?: string;
  DIRECCION?: string;
  CORREO?: string;
  AFP?: string;
  SALUD?: string;
  BANCO?: string;
  TIPO_DE_CUENTA?: string;
  N_CUENTA?: string;
  NOMBRE_ISAPRE?: string;
  ESTADO?: string;
  N_RELOJ_CONTROL?: string;
  CARGO?: string;
};

export type Archivador = {
  id: string;
  name: string;
  description?: string;
  createdAt: any;
  color?: string;
  year?: string;
};

export type IPLog = {
    id: string;
    employeeId: string;
    employeeName: string;
    device: string;
    ipAddress: string;
    lastSeen: string;
}
