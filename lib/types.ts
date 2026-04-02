
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
  fecha_aviso?: any;
};

export type Task = {
  id: string;
  'nombre tarea': string;
  name?: string;
  descripcion?: string;
  persona: string[] | string;
  fecha?: any;
  lugar?: string;
  estado: 'Pendiente' | 'En Progreso' | 'Completada' | 'Atrasada';
  prioridad: 'Alta' | 'Media' | 'Baja';
  correo?: string;
  assignedTo?: string;
  deadline?: string;
  // Recurrence fields
  tipo_tarea?: 'Día Único' | 'Semanal' | 'Mensual' | 'Anual';
  fecha_inicio?: string; // For single day, weekly, annual
  fecha_fin?: string; // For weekly, annual
  hora?: string;
  meses_seleccionados?: string[]; // For monthly
  dia_inicio_mensual?: number;
  dia_fin_mensual?: number;
  mes_anual?: string; // For annual
  color?: string; // For Gantt chart
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
  numero_interno?: string;
  tipo_arriendo?: string;
  'nombre equipo'?: string;
  modelo?: string;
  'tipo de equipo'?: 'IMPRESORA' | 'COMPUTADOR' | 'NOTEBOOK' | 'DATA' | 'CISCO' | 'SERVIDOR' | 'TV BOX' | 'VALTEK';
  descripcion?: string;
  'correo relacionado'?: string;
  estado?: 'Active' | 'En Reparación' | 'Fuera De Servicio';
  'ip equipo'?: string;
  'licencia office'?: string;
  'personal a cargo'?: string;
  'usuario del encargado'?: string;
  serial?: string;
  ubicacion?: string;
  imagen?: string;
  'fecha de ingreso'?: any;
  dns1?: string;
  dns2?: string;
  'puerta de enlace ipv4'?: string;
  'mascara ipv4'?: string;
  archivadorId?: string;
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

export type MonthlyTemplate = {
    id: string;
    NOMBRE: string;
    'NOMBRE REEMPLAZADO': string;
    CARGO?: string;
    UNIDAD?: string;
    MOTIVO?: string;
    FUNCIONES?: string;
    'JEFE SERVICIO'?: string;
    CORREO?: string;
    lastGeneratedMonth?: string;
};

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
  ESTADO_CIVIL?: string;
  fecha_aviso?: any;
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

export type Efemeride = {
  id: string;
  nombre: string;
  dia: number;
  mes: string;
  encargados: string[];
  funcionarios_afectos: string[];
};

export type EfemerideNotificationLog = {
  id: string;
  efemerideId: string;
  date: string;
  type: 'encargados-0-days' | 'afectos-0-days' | 'encargados-1-day' | 'encargados-2-days';
  sentAt: any;
};

export type NotificationRecipient = {
  id: string;
  email: string;
};

export type FuncionarioVale = {
  id: string;
  RUT: string;
  nombres: string;
  apellidos: string;
  estado: string; // 'Activo' | 'Inactivo'
  fechaIngreso?: any;
  departamento?: string;
  cargo?: string;
  acNo?: string;
  jornada?: string;
};

export type MarcaVale = {
  id: string;
  historialId?: string;
  funcionarioId: string;
  RUT: string;
  nombres: string;
  apellidos: string;
  mes: string; // YYYY-MM
  diasTrabajados: number;
  diasAusencia: number;
  montoAsignado?: number;
  observaciones?: string;
  fechaCarga?: any;
  detalles?: { horario: string; estado: string }[];
};

export type HistorialCargaVales = {
  id: string;
  mes: string;
  fechaCarga: any;
  cantidadRegistros: number;
  montoTotal: number;
};
