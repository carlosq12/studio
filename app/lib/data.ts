import type { Employee, Task, IPLog, Replacement } from './types';

export const employees: Employee[] = [
  {
    id: '1',
    'FECHA DE INGRESO': '2025-07-07',
    RUT: '19473561-8',
    'NOMBRE FUNCIONARIO': 'LORETO NAVIAR',
    'APELLIDO PATERNO': 'ESCALONA',
    'APELLIDO MATERNO': 'LOPEZ',
    phone: '952717904',
    birthDate: '1996-01-08',
    birthPlace: 'TALCA',
    address: 'TALCA, AV 26 SUR, N°0746',
    email: 'nutri.loretoescalona@gmail.com',
    afp: 'Modelo',
    healthSystem: 'Fonasa',
    bank: 'Banco Estado',
    accountType: 'Cuenta Rut',
    accountNumber: '19473561',
    isapreName: '',
    status: 'Activo',
    clockNumber: '101',
    role: 'Nutricionista',
    emergencyContact: { name: 'John Johnson', phone: '098-765-4321' },
    avatar: 'https://picsum.photos/seed/1/100/100',
    skills: ['Nutrición Clínica', 'Dietética'],
    currentWorkload: 3,
    availability: 'Tiempo Completo',
    'UNIDAD O SERVICIO': '',
    ESTAMENTO: '',
    TITULO: '',
    JEFATURA: '',
    firstName: 'LORETO NAVIAR',
    paternalLastName: 'ESCALONA'
  },
  {
    id: '2',
    'FECHA DE INGRESO': '2023-02-15',
    RUT: '18123456-7',
    'NOMBRE FUNCIONARIO': 'JUAN',
    'APELLIDO PATERNO': 'PÉREZ',
    'APELLIDO MATERNO': 'GONZÁLEZ',
    phone: '987654321',
    birthDate: '1992-05-20',
    birthPlace: 'SANTIAGO',
    address: 'AV. PROVIDENCIA 1234',
    email: 'juan.perez@example.com',
    afp: 'Capital',
    healthSystem: 'Fonasa',
    bank: 'Banco de Chile',
    accountType: 'Cuenta Corriente',
    accountNumber: '123456789',
    isapreName: '',
    status: 'Activo',
    clockNumber: '102',
    role: 'Ingeniero de Software',
    emergencyContact: { name: 'Maria González', phone: '912345678' },
    avatar: 'https://picsum.photos/seed/2/100/100',
    skills: ['React', 'Node.js', 'TypeScript'],
    currentWorkload: 5,
    availability: 'Tiempo Completo',
    'UNIDAD O SERVICIO': '',
    ESTAMENTO: '',
    TITULO: '',
    JEFATURA: '',
    firstName: 'JUAN',
    paternalLastName: 'PÉREZ'
  },
];

export const tasks: Task[] = [
  { id: 'T001', name: 'Desarrollar página de inicio de sesión', 'nombre tarea': 'Desarrollar página de inicio de sesión', descripcion: 'Crear la interfaz de usuario y la lógica para la página de inicio de sesión.', persona: '2', fecha: '2024-08-15', hora: '10:00', prioridad: 'Alta', estado: 'En Progreso', lugar: '', 'cantidad de reuniones': '' },
  { id: 'T002', name: 'Planificar campaña de marketing Q4', 'nombre tarea': 'Planificar campaña de marketing Q4', descripcion: 'Definir objetivos, presupuesto y canales para la campaña del Q4.', persona: '2', fecha: '2024-08-20', hora: '11:00', prioridad: 'Alta', estado: 'Pendiente', lugar: '', 'cantidad de reuniones': '' },
  { id: 'T003', name: 'Diseñar nuevos iconos para el dashboard', 'nombre tarea': 'Diseñar nuevos iconos para el dashboard', descripcion: 'Crear un conjunto de 10 nuevos iconos para el dashboard principal.', persona: '2', fecha: '2024-08-10', hora: '14:00', prioridad: 'Media', estado: 'Completada', lugar: '', 'cantidad de reuniones': '' },
  { id: 'T004', name: 'Configurar pipeline de CI/CD', 'nombre tarea': 'Configurar pipeline de CI/CD', descripcion: 'Configurar el pipeline de despliegue en AWS para el nuevo servicio.', persona: '2', fecha: '2024-08-25', hora: '15:00', prioridad: 'Alta', estado: 'En Progreso', lugar: '', 'cantidad de reuniones': '' },
  { id: 'T005', name: 'Escribir pruebas E2E para el flujo de pago', 'nombre tarea': 'Escribir pruebas E2E para el flujo de pago', descripcion: 'Usar Cypress para probar todo el proceso de pago.', persona: '2', fecha: '2024-07-30', hora: '16:00', prioridad: 'Media', estado: 'Atrasada', lugar: '', 'cantidad de reuniones': '' },
  { id: 'T006', name: 'Refactorizar servicio de autenticación', 'nombre tarea': 'Refactorizar servicio de autenticación', descripcion: 'Mejorar el rendimiento y la seguridad del servicio de autenticación.', persona: '2', fecha: '2024-09-01', hora: '17:00', prioridad: 'Media', estado: 'Pendiente', lugar: '', 'cantidad de reuniones': '' },
];

export const ipLogs: IPLog[] = [
  { id: 'IP001', employeeId: '1', employeeName: 'LORETO NAVIAR ESCALONA LOPEZ', device: 'MacBook Pro', ipAddress: '192.168.1.101', lastSeen: '2024-07-29T10:00:00Z' },
  { id: 'IP002', employeeId: '2', employeeName: 'JUAN PÉREZ GONZÁLEZ', device: 'Desktop-PC', ipAddress: '192.168.1.102', lastSeen: '2024-07-29T09:55:00Z' },
];

export const replacements: Replacement[] = [
  { id: 'R001', originalEmployeeId: '1', replacementEmployeeId: '2', date: '2024-08-05', shift: '09:00-17:00', reason: 'Cita Médica', status: 'Aprobado' },
  { id: 'R002', originalEmployeeId: '2', replacementEmployeeId: '1', date: '2024-08-07', shift: '14:00-22:00', reason: 'Ausencia Personal', status: 'Pendiente de Aprobación' },
];
