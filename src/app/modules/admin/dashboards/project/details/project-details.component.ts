import {
  Component,
  OnInit,
  LOCALE_ID,
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectorRef,
  ViewChildren,
  QueryList,
  ElementRef,
  AfterViewInit,
} from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { ProjectService } from "../project.service";
import { ClientsService } from "../../../catalogs/clients/clients.service";
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule,
  AbstractControl,
  FormControl,
} from "@angular/forms";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatButtonModule } from "@angular/material/button";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatTabsModule } from "@angular/material/tabs";
import { MatNativeDateModule } from "@angular/material/core";
import { CommonModule } from "@angular/common";
import { debounceTime, Observable } from "rxjs";
import { NgxMatSelectSearchModule } from "ngx-mat-select-search";
import { registerLocaleData } from "@angular/common";
import localeEs from "@angular/common/locales/es";
import { MAT_DATE_LOCALE } from "@angular/material/core";
import { MatIconModule } from "@angular/material/icon";
import { UsersService } from "../../../security/users/users.service";
import { map, startWith } from "rxjs/operators";
import { MatChipsModule } from "@angular/material/chips";
import { MatAutocompleteModule } from "@angular/material/autocomplete";
import { MatChipInputEvent } from "@angular/material/chips";
import { eq, set } from "lodash";
import { MatSnackBar } from '@angular/material/snack-bar'; // Asegúrate de tenerlo importado
import Swal from 'sweetalert2';
import Gantt from "frappe-gantt";
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { TemplateRef, ViewChild } from '@angular/core';
import { NeumorphicProgressComponent } from '@fuse/components/neumorphic-progress/neumorphic-progress.component';
import { OnlyOfficeEditorComponent } from '@fuse/components/only-office-editor/only-office-editor.component';
import { CurrencyPipe } from '@angular/common';
import { environment } from 'environments/environment'; // Asegúrate de tener la URL base de tu API aquí
import {DocumentEditorModule, type IConfig} from "@onlyoffice/document-editor-angular";
import { HistorialComponent } from '../historial-archivo/historial.component';

registerLocaleData(localeEs);
@Component({
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: "app-project-details",
  templateUrl: "./project-details.component.html",
  styleUrls: ["./project-details.component.scss"],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    NgxMatSelectSearchModule,
    MatTabsModule,
    MatIconModule,
    MatChipsModule,
    MatAutocompleteModule,
    NeumorphicProgressComponent,
    DocumentEditorModule
  ],
  providers: [
    CurrencyPipe,
    { provide: LOCALE_ID, useValue: "es-ES" }, // Idioma general Angular
    { provide: MAT_DATE_LOCALE, useValue: "es-ES" }, // Idioma para Angular Material (como el Datepicker)
  ],
})
export class ProjectDetailsComponent implements OnInit, AfterViewInit {
  //modulod e archivos
  projectForm: FormGroup;
  categorias: any[] = [];
  unidadesDeNegocio: any[] = [];
  clients: any[] = [];
  projectId: number | null = null;

  clienteFiltro = new FormControl("");
  filteredClients: any[] = [];
  estatus: any[] = [];

  files: any[] = [];
  filesEvidencias: any[] = [];
  //informacion de usuario logeado
  user: any[] = [];

  // Lista de personas seleccionadas
  personasSeleccionadas: any[] = [];

  // Lista de personas seleccionadas
  personasSeleccionadasGantt: any[] = [];

  // Control de búsqueda de personas
  personasControl = new FormControl();
  personasControlGantt = new FormControl();
  filteredUsers: Observable<any[]>; // Lista filtrada de usuarios
  filteredUsersGantt: Observable<any[]>; // Lista filtrada de usuarios
  disabledArchivos: boolean = true;

  taskForm: FormGroup;
  tasks: any[] = [];
  gantt: any;

  viewMode: 'Day' | 'Week' | 'Month' = 'Day';

  @ViewChild('editTaskDialog') editTaskDialog!: TemplateRef<any>;

  dialogRef!: MatDialogRef<any>;
  editForm!: FormGroup;
  selectedTaskId!: string;
  selectedTask: any;

  categoriasInputsParte1 = [
    { key: 'ordenCompra', label: 'OC' },
    { key: 'cotizacion', label: 'Cotización' },
    { key: 'fianza', label: 'Fianzas' },
    { key: 'contrato', label: 'Contrato' },
    { key: 'polizas', label: 'Pólizas' }
  ];

  categoriasInputsParte2 = [
    { key: 'programaTrabajo', label: 'Programa de trabajo' },
    { key: 'ast', label: 'AST' },
    { key: 'documentacionIngreso', label: 'Documentación ingreso planta' },
    { key: 'memorandos', label: 'Memorandos' },
    { key: 'anticiposPagos', label: 'Anticipos/Pagos' },
    { key: 'listadoMateriales', label: 'Listado de materiales' },
    //{ key: 'compraMateriales', label: 'Compra de materiales' },
    { key: 'equiposHerramientas', label: 'Equipos/Herramientas' },
    { key: 'reportes', label: 'Reportes' },
    //{ key: 'almacenCampo', label: 'Almacén en campo' },
    { key: 'entregaRecepcion', label: 'Entrega recepción' },
    { key: 'dossier', label: 'Dossier' },
    { key: 'cierreFianza', label: 'Cierre de fianza' },
    { key: 'garantias', label: 'Garantías' },
    { key: 'encuesta', label: 'Encuesta de satisfacción' },
    { key: 'comentarios', label: 'Comentarios' }
  ];


  fileInputs: { [key: string]: HTMLInputElement } = {};
  @ViewChildren('fileInput') fileInputsRef!: QueryList<ElementRef<HTMLInputElement>>;

  nuevoAnticipo: number | null = null;
  mostrarHistorial = false;

  // Variables para mostrar formateadas
  pagoTotalDisplay: string = '';
  anticipoDisplay: string = '';

  progressValue: number;

  onlyOfficeDocsUrl: any = environment.apiOnlyOffice; // URL pública del Servidor de Documentos
  onlyOfficeApiUrl: any = `${environment.apiUrl}/Proyecto`; // URL pública de la API de OnlyOffice

  constructor(
    private fb: FormBuilder,
    private projectService: ProjectService,
    private route: ActivatedRoute,
    public router: Router,
    private clientsService: ClientsService,
    private _usersService: UsersService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog, // ✅ Esta línea es clave
    private currencyPipe: CurrencyPipe
  ) {
    // Filtrar los usuarios a medida que se escribe en el campo
    this.filteredUsers = this.personasControl.valueChanges.pipe(
      startWith(""),
      map((value) => this._filter(value))
    );

    // Filtrar los usuarios a medida que se escribe en el campo (Gantt)
    this.filteredUsersGantt = this.personasControlGantt.valueChanges.pipe(
      startWith(""),
      map((value) => this._filter(value))
    );
  }

  ngOnInit(): void {
    this.projectForm = this.fb.group({
      proyectoId: [0],
      nombre: [null, Validators.required],

      // 🔑 CAMPO CORREGIDO: 'categoria' coincide con ProyectoDTO
      categoria: [null, Validators.required],

      lugar: ['NA'],

      // 🔑 CAMPO CORREGIDO: 'unidadDeNegocio' coincide con ProyectoDTO
      unidadDeNegocio: [null, Validators.required],

      fechaInicio: [null, Validators.required],
      fechaFin: [null],
      estado: ['NA'],

      cliente: [0, [Validators.required, this.noZeroValidator]],
      necesidad: [null],
      direccion: [null],

      // --- CONTACTOS INTERNOS EXISTENTES ---
      // Estos campos coinciden con el DTO
      nombreContacto: [null],
      telefono: [null],
      empresa: [null],

      // ⚠️ CAMPOS ELIMINADOS/NO MAPPABLES:
      // Eliminé 'nombreContactoResponsable', 'telefonoResponsable', 'empresaResponsable',
      // 'nombreContactoSupervisor', 'telefonoSupervisor', 'empresaSupervisor'
      // ya que no existen en tu ProyectoDTO. Usaremos los nuevos campos abajo.

      // --- CONTACTO RESPONSABLE DE PROYECTO CLIENTE ---
      // Estos campos coinciden con el DTO
      nombreContactoCliente: [null],
      areaContactoCliente: [null],
      telefonoContactoCliente: [null],
      correoContactoCliente: [null],

      // --- SUPERVISOR EN CAMPO (CLIENTE) ---
      // 🔑 CAMPO CORREGIDO: Coincide con NombreSupervisorCampo (NO 'Cliente')
      nombreSupervisorCampo: [null],
      areaSupervisorCampo: [null],
      telefonoSupervisorCampo: [null],
      correoSupervisorCampo: [null],

      // --- RESPONSABLE DEL PROYECTO JR ---
      // 🔑 CAMPO CORREGIDO: Coincide con NombreResponsableProyectoJR (NO 'JR' a secas)
      nombreResponsableProyectoJR: [null],
      areaResponsableProyectoJR: [null],
      telefonoResponsableProyectoJR: [null],
      correoResponsableProyectoJR: [null],

      // --- RESPONSABLE DE CAMPO JR ---
      // 🔑 CAMPO CORREGIDO: Coincide con NombreResponsableCampoJR (NO 'CampoJR' a secas)
      nombreResponsableCampoJR: [null],
      areaResponsableCampoJR: [null],
      telefonoResponsableCampoJR: [null],
      correoResponsableCampoJR: [null],

      // --- DOCUMENTOS Y ARCHIVOS ---
      levantamiento: [null],
      planoArquitectonico: [null],
      diagramaIsometrico: [null],
      diagramaUnifilar: [null],

      // --- MATERIALES ---
      materialesCatalogo: [null],
      materialesPresupuestados: [null],
      inventarioFinal: [null],
      cuadroComparativo: [null],

      proveedor: [null],

      // --- RECURSOS ---
      manoDeObra: [null],
      personasParticipantes: [null],
      equipos: [null],
      herramientas: [null],

      // --- COSTOS ---
      indirectosCostos: [0],
      fianzas: [0],
      anticipo: [0],
      cotizacion: [0],

      // --- CONTRATOS Y DOCUMENTOS ---
      ordenDeCompra: [null],
      contrato: [null],

      // --- SEGUIMIENTO ---
      programaDeTrabajo: [null],
      avancesReportes: [null],
      comentarios: [null],
      hallazgos: [null],
      dosier: [null],
      rutaCritica: [null],

      // --- FINANZAS ---
      factura: [null],
      pago: [0],
      utilidadProgramada: [0],
      utilidadReal: [0],
      financiamiento: [0],
      pagoTotal: [0],
      // 🔑 CAMPO CORREGIDO: Se ajusta el valor inicial de string a null
      anticipoList: [null],

      // --- CIERRE ---
      cierreProyectoActaEntrega: [null],
      estatus: [0, [Validators.required, this.noZeroValidator]],

      liderProyectoId: [null],
      entregables: [null],
      cronograma: [null],

      // 🔑 CAMPO AÑADIDO: Coincide con la propiedad 'Active' del DTO
      active: [true],

      // 🔑 CAMPO AÑADIDO: Coincide con la propiedad 'GanttTasks' del DTO
      ganttTasks: [[]],
      responsableCompraMateriales: [null],
      responsableAlmacenCampo: [null]
    });

    this.getCategorias();
    this.getUnidadesDeNegocio();
    this.getClientes();
    this.getEstatus();


    this.route.paramMap.subscribe((params) => {
      const id = params.get("id");
      if (!id || id === "new") {
        this.projectId = null; // Se trata de un nuevo proyecto
        this.getUsers();
      } else {
        this.getUsers();
        this.projectId = Number(id);
        this.loadProject(this.projectId);
        this.getFilesAll();
        this.disabledArchivos = false;
        setTimeout(() => {
          this.progressValue = this.getPagoProgreso();
        }, 1000); // Espera un poco para que se cargue el Gantt
      }
    });

    this.taskForm = this.fb.group({
      name: ["", Validators.required],
      start: [null, Validators.required],
      end: [null, Validators.required],
      equipo: [null],
      dependencies: [[]], // como array inicialmente
      estatus: ["2"]
    });


    this.editForm = this.fb.group({
      name: ["", Validators.required],
      progress: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      start: [null],
      end: [null],
      equipo: [''],
      dependencies: [''],
      estatus: [null]
    });

    // Inicializa valores del form con formato
    const pagoTotal = this.projectForm.get('pagoTotal')?.value || 0;
    this.pagoTotalDisplay = this.currencyPipe.transform(pagoTotal, 'MXN', 'symbol', '1.2-2') || '';

    this.anticipoDisplay = this.currencyPipe.transform(0, 'MXN', 'symbol', '1.2-2') || '';
  }

  ngAfterViewInit(): void {
    // Mapea cada input con su categoría
    this.fileInputsRef.forEach((ref) => {
      const key = ref.nativeElement.getAttribute('data-key');
      if (key) {
        this.fileInputs[key] = ref.nativeElement;
      }
    });
  }

  initGantt(): void {
    const container = document.getElementById("gantt");
    if (!container) return;

    container.innerHTML = "";

    // Asegurarse de que cada tarea tenga su custom_class
    const tasksWithClass = this.tasks.map(t => ({
      ...t,
      custom_class: t.custom_class || this.getClassByStatus(t.estatus)
    }));

    this.gantt = new Gantt(container, tasksWithClass, {
      view_mode: this.viewMode,
      language: 'es',
      popup: '',
      on_click: (task) => {
        const foundTask = this.tasks.find(t => t.id === task.id);
        if (!foundTask) return;

        this.selectedTaskId = task.id;
        this.editForm.setValue({
          name: foundTask.name,
          progress: foundTask.progress,
          start: foundTask.start ? new Date(foundTask.start) : null,
          end: foundTask.end ? new Date(foundTask.end) : null,
          equipo: foundTask.equipo || '',
          dependencies: foundTask.dependencies || [],
          estatus: foundTask.estatus || '2'
        });


        this.openEditDialog(task);
      },
    });

    // Listener global de progreso
    if (!container.hasAttribute('data-progress-listener')) {
      container.addEventListener("input", (event) => {
        const target = event.target as HTMLInputElement;
        if (target && target.type === "range" && target.id.startsWith("progress-input-")) {
          const taskId = target.id.replace("progress-input-", "");
          const newProgress = Number(target.value);
          const span = document.getElementById(`${target.id}-value`);
          if (span) span.textContent = newProgress.toString();
          if (this.gantt) this.gantt.progress(taskId, newProgress);
        }
      });
      container.setAttribute('data-progress-listener', 'true');
    }
  }


  // 🔹 Función para retornar color hexadecimal según estatus
  getHexColorByStatus(status: string): string {
    switch (status) {
      case '1': return "#28a745"; // verde
      case '2': return "#ffc107"; // amarillo
      case '3': return "#fd7e14"; // naranja
      case '4': return "#dc3545"; // rojo
      default: return "#6c757d"; // gris
    }
  }


  getEstatus(): void {
    this.projectService.getEstatus().subscribe((data) => (this.estatus = data));
  }

  noZeroValidator(control: AbstractControl) {
    return control.value === 0 ? { noZero: true } : null;
  }
  getCategorias(): void {
    this.projectService
      .getCategorias()
      .subscribe((data) => (this.categorias = data));
  }

  getUnidadesDeNegocio(): void {
    this.projectService
      .getUnidadesDeNegocio()
      .subscribe((data) => (this.unidadesDeNegocio = data));
  }

  getClientes(): void {
    this.clientsService.getClient().subscribe((data) => {
      this.clients = data;
      this.filteredClients = this.clients;

      // Suscribirse al filtro con debounce
      this.clienteFiltro.valueChanges
        .pipe(debounceTime(200))
        .subscribe((value: string) => {
          const filterValue = value?.toLowerCase() || "";
          this.filteredClients = this.clients.filter((client) =>
            `${client.clienteId} - ${client.nombre}`
              .toLowerCase()
              .includes(filterValue)
          );
        });
    });
  }

  loadProject(id: number): void {
    this.projectService.getProjectById(this.projectId).subscribe((projects) => {
      if (projects.code == 200) {
        const project = projects.data;
        const tasks = projects.data.ganttTasks || [];

        this.tasks = tasks.map((task: any) => ({
          ...task,
          id: task.tempId || task.id, // usa tempId si existe, sino el id original
          start: new Date(task.startDate),
          end: new Date(task.endDate),
          TempId: task.tempId || task.id, // mantén el id temporal si existe
          dependencies: task.dependencies ? task.dependencies.split(',') : [],
          estatus: task.estatus ? task.estatus.toString() : '2',
          custom_class: this.getClassByStatus(task.estatus ? task.estatus.toString() : '2'),
          equipo: task.equipo || ''
        }));

        if (project) {
          this.projectForm.patchValue({
            proyectoId: project.proyectoId,
            nombre: project.nombre,
            // 🔑 Mapeo corregido a 'categoria' y 'unidadDeNegocio' (del DTO)
            categoria: project.categoria,
            lugar: project.lugar,
            unidadDeNegocio: project.unidadDeNegocio,
            fechaInicio: project.fechaInicio,
            fechaFin: project.fechaFin,
            estado: project.estado,

            // Nuevas propiedades base
            cliente: project.cliente,
            necesidad: project.necesidad,
            direccion: project.direccion,
            nombreContacto: project.nombreContacto,
            telefono: project.telefono,
            empresa: project.empresa,

            // =======================================================
            // 🔑 CAMPOS DE CONTACTO AGREGADOS (COINCIDEN CON FORMULARIO Y DTO)
            // Contacto Responsable del Proyecto (Cliente)
            nombreContactoCliente: project.nombreContactoCliente,
            areaContactoCliente: project.areaContactoCliente,
            telefonoContactoCliente: project.telefonoContactoCliente,
            correoContactoCliente: project.correoContactoCliente,

            // Supervisor en Campo (Cliente)
            nombreSupervisorCampo: project.nombreSupervisorCampo,
            areaSupervisorCampo: project.areaSupervisorCampo,
            telefonoSupervisorCampo: project.telefonoSupervisorCampo,
            correoSupervisorCampo: project.correoSupervisorCampo,

            // Responsable del Proyecto JR
            nombreResponsableProyectoJR: project.nombreResponsableProyectoJR,
            areaResponsableProyectoJR: project.areaResponsableProyectoJR,
            telefonoResponsableProyectoJR: project.telefonoResponsableProyectoJR,
            correoResponsableProyectoJR: project.correoResponsableProyectoJR,

            // Responsable de Campo JR
            nombreResponsableCampoJR: project.nombreResponsableCampoJR,
            areaResponsableCampoJR: project.areaResponsableCampoJR,
            telefonoResponsableCampoJR: project.telefonoResponsableCampoJR,
            correoResponsableCampoJR: project.correoResponsableCampoJR,
            // =======================================================

            // Documentos y Levantamientos
            levantamiento: project.levantamiento,
            planoArquitectonico: project.planoArquitectonico,
            diagramaIsometrico: project.diagramaIsometrico,
            diagramaUnifilar: project.diagramaUnifilar,

            // Materiales
            materialesCatalogo: project.materialesCatalogo,
            materialesPresupuestados: project.materialesPresupuestados,
            inventarioFinal: project.inventarioFinal,
            cuadroComparativo: project.cuadroComparativo,
            proveedor: project.proveedor,

            // Recursos
            manoDeObra: project.manoDeObra,
            personasParticipantes: project.personasParticipantes,
            equipos: project.equipos,
            herramientas: project.herramientas,

            // Costos
            indirectosCostos: project.indirectosCostos,
            fianzas: project.fianzas,
            anticipo: project.anticipo,
            cotizacion: project.cotizacion,

            // Contratos y Documentos
            ordenDeCompra: project.ordenDeCompra,
            contrato: project.contrato,

            // Seguimiento
            programaDeTrabajo: project.programaDeTrabajo,
            avancesReportes: project.avancesReportes,
            comentarios: project.comentarios,
            hallazgos: project.hallazgos,
            dosier: project.dosier,
            rutaCritica: project.rutaCritica,

            // Finanzas
            factura: project.factura,
            pago: project.pago,
            utilidadProgramada: project.utilidadProgramada,
            utilidadReal: project.utilidadReal,
            financiamiento: project.financiamiento,

            // Cierre
            cierreProyectoActaEntrega: project.cierreProyectoActaEntrega,
            estatus: project.estatus,
            liderProyectoId: project.liderProyectoId,
            entregables: project.entregables,
            cronograma: project.cronograma,

            // Metadatos y Totales
            pagoTotal: project.pagoTotal || 0,
            // Mapea la cadena (e.g., "100;50;200") directamente
            anticipoList: project.anticipoList || null,
            active: project.active, // 🔑 AGREGADO: Carga el estado activo
            responsableCompraMateriales: project.responsableCompraMateriales,
            responsableAlmacenCampo: project.responsableAlmacenCampo
          });

          // Lógica de visualización y cálculo de anticipos (se mantiene)
          const pagoTotal = project.pagoTotal || 0;
          this.pagoTotalDisplay = this.currencyPipe.transform(pagoTotal, 'MXN', 'symbol', '1.2-2', 'es-MX') || '';

          const totalAnticipos = (project.anticipoList as string)
            ?.split(';')
            .map(v => Number(v.trim()) || 0)
            .reduce((acc, val) => acc + val, 0) || 0;
          this.anticipoDisplay = this.currencyPipe.transform(totalAnticipos, 'MXN', 'symbol', '1.2-2') || '';
        }
      } else {
        Swal.fire({
          icon: "error",
          title: "Opps",
          text: "Hubo un error en el sistema, contacte al administrador del sistema.",
          draggable: true
        });
      }
    });
  }

  personasSeleccionadadload(): void {
    // Obtenemos los IDs de personasParticipantes desde el formulario
    const personasParticipantes = this.projectForm.get('personasParticipantes')?.value;
    if (personasParticipantes) {
      // Dividimos los IDs concatenados en un array
      const personasIds = personasParticipantes.split(",");
      // Creamos un array de objetos con los usuarios basados en esos IDs
      this.personasSeleccionadas = personasIds
        .map((id) => {
          const user = this.getUserById(id); // Buscar usuario por ID (debe haber un método o lista para esto)
          return user ? user : null; // Si se encuentra el usuario, lo agregamos al array
        })
        .filter((persona) => persona !== null); // Filtramos cualquier valor nulo
      // Si quieres también actualizar el formulario con los usuarios
      this.updatePersonasParticipantesField();
    }
  }


  personasSeleccionadadloadGantt(): void {
    // Obtenemos los IDs de personasParticipantes desde el formulario
    const personasParticipantes = this.editForm.get('equipo')?.value;
    if (personasParticipantes) {
      // Dividimos los IDs concatenados en un array
      const personasIds = personasParticipantes.split(",");
      // Creamos un array de objetos con los usuarios basados en esos IDs
      this.personasSeleccionadasGantt = personasIds
        .map((id) => {
          const user = this.getUserById(id); // Buscar usuario por ID (debe haber un método o lista para esto)
          return user ? user : null; // Si se encuentra el usuario, lo agregamos al array
        })
        .filter((persona) => persona !== null); // Filtramos cualquier valor nulo
      // Si quieres también actualizar el formulario con los usuarios
      this.updatePersonasParticipantesFieldGantt();
    }
  }

  saveProject(): void {
    if (this.projectForm.invalid) {
      Swal.fire({
        icon: "error",
        title: "Opps",
        text: "Por favor, completa los campos obligatorios",
        draggable: true
      });
      return;
    }

    const { anticipoList, ...restFormValues } = this.projectForm.value;

    const nuevoValor = this.nuevoAnticipo?.toString().trim();
    const historialPrevio = anticipoList || '';

    let anticipoListFinal = historialPrevio;

    // Si hay un nuevo valor y es numérico válido
    if (nuevoValor && !isNaN(Number(nuevoValor))) {
      anticipoListFinal = historialPrevio
        ? `${historialPrevio};${nuevoValor}`
        : nuevoValor;
    }

    const projectData: any = {
      ...restFormValues, // todo menos anticipoList y nuevoAnticipo
      anticipoList: anticipoListFinal,
      ganttTasks: this.tasks.map(task => ({
        id: null,
        name: task.name,
        startDate: task.start instanceof Date ? task.start.toISOString() : task.start,
        endDate: task.end instanceof Date ? task.end.toISOString() : task.end,
        progress: task.progress ?? 0,
        dependencies: task.dependencies?.join(",") ?? "",
        equipo: task.equipo ?? "",
        TempId: task.id,
        estatus: task.estatus ?? "2"
      }))
    };

    if (this.projectId) {
      // Actualizar proyecto
      projectData.proyectoId = this.projectId;
      this.projectService.updateProject(projectData).subscribe(() => {
        // Redirigir a la lista de proyectos
        this.router.navigate(["/dashboards/project"]); // O la ruta correspondiente a la lista
      });
    } else {
      // Crear nuevo proyecto
      this.projectService.createProject(projectData).subscribe(() => {
        // Redirigir a la lista de proyectos
        this.router.navigate(["/dashboards/project"]); // O la ruta correspondiente a la lista
      });
    }
  }

  getFilesAll(): void {
    if (!this.projectId) return;

    this.projectService.getFiles(this.projectId).subscribe((files) => {

      if (files == null) {
        this.files = [];
        this.filesEvidencias = [];
        return;
      }

      // Combinar archivos de proyecto y archivos de cotización
      const allFiles = [
        ...(files.archivosProyecto || []),
        ...(files.archivosCotizacion || [])
      ].map((file) => ({
        ...file,
        type: this.getFileType(file.nombreArchivo),
      }));

      if (allFiles && allFiles.length > 0) {
        // Separar los archivos por categoría
        this.filesEvidencias = allFiles.filter(f => f.categoria.toLowerCase() === 'evidencias');
        this.files = allFiles.filter(f => f.categoria.toLowerCase() !== 'evidencias');
      } else {
        this.files = [];
        this.filesEvidencias = [];
      }

    });
  }


  // Función para obtener el tipo de archivo según la extensión
  getFileType(nombreArchivo: string): string {
    const extension = nombreArchivo
      ? nombreArchivo.split(".").pop()?.toLowerCase()
      : "";

    switch (extension) {
      case "pdf":
        return "PDF";
      case "doc":
      case "docx":
        return "DOC";
      case "xls":
      case "xlsx":
        return "XLS";
      case "txt":
        return "TXT";
      case "jpg":
      case "jpeg":
        return "JPG";
      case "png":
        return "PNG";
      default:
        return "OTRO";
    }
  }

  levantamientoFile: File | null = null;

  onFileSelected(event: any, tipo: string) {
    const file: File = event.target.files[0];
    if (file && tipo) {
      this.subirArchivo(file, tipo);
    }
  }

  ordenCompraFile: File | null = null;
  fianzaFile: File | null = null;
  compraFile: File | null = null;

  onFileSelectedOne(event: Event, tipo: string) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];

    if (tipo === 'ordenCompra') {
      this.ordenCompraFile = file;
    }
    if (tipo === 'fianza') {
      this.fianzaFile = file;
    }
    if (tipo === 'compra') {
      this.compraFile = file;
    }
    if (file && tipo) {
      this.subirArchivo(file, tipo);
    }
  }


  // Si deseas subirlo en ese mismo momento:
  subirArchivo(event: any, categoria: string): void {
    const archivo = event;
    if (!archivo) return;

    const formData = new FormData();
    formData.append("proyectoId", this.projectId?.toString() || ""); // asegúrate que esté definido
    formData.append("categoria", categoria);
    formData.append("archivo", archivo);

    this.projectService.uploadFile(formData).subscribe({
      next: (res) => {
        if (res.code == 200) {
          this.snackBar.open('Archivo subido correctamente.', 'Cerrar', {
            duration: 3000,
            panelClass: ['snackbar-success']
          });
          this.getFilesAll();
        }
        else {
          Swal.fire({
            icon: "error",
            title: "Opps",
            text: "Hubo un error en el sistema, contacte al administrador del sistema.",
            draggable: true
          });

        }
      },
      error: (err) => {
        Swal.fire({
          icon: "error",
          title: "Opps",
          text: "Hubo un error en el sistema, contacte al administrador del sistema.",
          draggable: true
        });

      },
    });
  }

  trackByFn(index: number, item: any): any {
    return item.id || index;
  }

  downloadFile(
    proyectoId: number,
    categoria: string,
    nombreArchivo: string
  ): void {
    if (categoria.toLowerCase() === 'cotizacion') {
      this.projectService
        .downloadFileCotizacion(proyectoId, categoria, nombreArchivo)
        .subscribe(
          (response: Blob) => {
            const a = document.createElement("a");
            const objectUrl = URL.createObjectURL(response);
            a.href = objectUrl;
            a.download = nombreArchivo;
            a.click();
            URL.revokeObjectURL(objectUrl); // Limpiar el objeto URL
          },
          (error) => {
            console.error("Error al descargar el archivo:", error);
          }
        );
    } else {
      this.projectService
        .downloadFile(proyectoId, categoria, nombreArchivo)
        .subscribe(
          (response: Blob) => {
            const a = document.createElement("a");
            const objectUrl = URL.createObjectURL(response);
            a.href = objectUrl;
            a.download = nombreArchivo;
            a.click();
            URL.revokeObjectURL(objectUrl); // Limpiar el objeto URL
          },
          (error) => {
            console.error("Error al descargar el archivo:", error);
          }
        );
    }
  }

  deleteFile(proyectoId: number, categoria: string, nombreArchivo: string): void {
    this.projectService.removeFile(proyectoId, categoria, nombreArchivo).subscribe({
      next: (res: any) => {
        if (res.code === 200) {
          this.snackBar.open('Archivo eliminado correctamente.', 'Cerrar', {
            duration: 3000,
            panelClass: ['snackbar-success']
          });
          this.getFilesAll(); // Recarga la lista de archivos
        } else {
          Swal.fire({
            icon: "error",
            title: "Oops",
            text: "Hubo un error en el sistema, contacte al administrador.",
            draggable: true
          });
        }
      },
      error: (err) => {
        Swal.fire({
          icon: "error",
          title: "Oops",
          text: "Hubo un error en el sistema, contacte al administrador.",
          draggable: true
        });
      }
    });
  }


  getUsers(): void {
    this._usersService.getUsers().subscribe((users) => {
      this.user = users.filter(
        (user) => user.rolId !== 1 && user.rolId !== 3 && user.activo !== false
      );
      this.personasSeleccionadadload();
      this.personasSeleccionadadloadGantt();
    });
  }

  // Filtrar los usuarios
  private _filter(value: string): any[] {
    if (typeof value !== "string") {
      return [];
    }
    const filterValue = value.toLowerCase();
    return this.user.filter((usuario) =>
      usuario.nombreUsuario.toLowerCase().includes(filterValue)
    );
  }

  // Agregar una persona desde el campo de entrada
  addPersona(event: MatChipInputEvent): void {
    // Solo agregamos la persona si el token no está vacío
    const input = event.input;
    const value = event.value;
    if ((value || "").trim()) {
      // Aquí deberías estar buscando el usuario en tu lista de usuarios
      const persona = this.user.find((u) => u.nombreUsuario === value.trim());

      if (persona && !this.personasSeleccionadas.includes(persona)) {
        this.personasSeleccionadas.push(persona); // Agregamos la persona seleccionada
        this.updatePersonasParticipantesField(); // Actualizar el campo
      }
    }

    // Limpiar el input después de agregar
    if (input) {
      input.value = "";
    }
    // Restablecer el control del formulario
    input.value = "";
    this.personasControl.setValue(null);
  }



  // Agregar una persona desde el autocomplete
  addPersonaFromAutoComplete(event: any): void {
    const selectedPersona = event.option.value;
    if (
      !this.personasSeleccionadas.find(
        (p) => p.usuarioId === selectedPersona.usuarioId
      )
    ) {
      this.personasSeleccionadas.push(selectedPersona);
      this.personasControl.setValue(null);
      this.updatePersonasParticipantesField(); // Actualizar el campo
    }
  }

  // Agregar una persona desde el autocomplete
  addPersonaFromAutoCompleteGantt(event: any): void {
    const selectedPersona = event.option.value;
    if (
      !this.personasSeleccionadasGantt.find(
        (p) => p.usuarioId === selectedPersona.usuarioId
      )
    ) {
      this.personasSeleccionadasGantt.push(selectedPersona);
      this.personasControlGantt.setValue(null);
      this.updatePersonasParticipantesFieldGantt(); // Actualizar el campo
    }
  }

  updatePersonasParticipantesField(): void {
    // Concatenar los IDs de las personas seleccionadas y guardarlos en el campo personasParticipantes
    const selectedIds = this.personasSeleccionadas.map(
      (persona) => persona.usuarioId
    );
    const idsConcatenados = selectedIds.join(","); // Concatenar los IDs separados por coma
    this.projectForm.patchValue({
      personasParticipantes: idsConcatenados, // Guardar los IDs como una cadena separada por comas
    });
  }

  updatePersonasParticipantesFieldGantt(): void {
    // Concatenar los IDs de las personas seleccionadas y guardarlos en el campo personasParticipantes
    const selectedIds = this.personasSeleccionadasGantt.map(
      (persona) => persona.usuarioId
    );
    const idsConcatenados = selectedIds.join(","); // Concatenar los IDs separados por coma
    this.editForm.patchValue({
      equipo: idsConcatenados, // Guardar los IDs como una cadena separada por comas
    });
  }

  getUserById(id: string): any {
    // Suponiendo que tienes una lista de usuarios
    return this.user.find((user) => user.usuarioId === Number(id));
  }

  removePersona(persona: any): void {
    const index = this.personasSeleccionadas.indexOf(persona);
    if (index >= 0) {
      this.personasSeleccionadas.splice(index, 1); // Eliminar del array
      this.updatePersonasParticipantesField();     // 🔸 Actualizar los IDs concatenados en el form
    }
  }

  removePersonaGantt(persona: any): void {
    const index = this.personasSeleccionadasGantt.indexOf(persona);
    if (index >= 0) {
      this.personasSeleccionadasGantt.splice(index, 1); // Eliminar del array
      this.updatePersonasParticipantesFieldGantt();     // 🔸 Actualizar los IDs concatenados en el form
    }
  }

  addTask(): void {
    if (this.taskForm.invalid) return;

    const formValue = this.taskForm.value;

    // Obtener el siguiente ID
    const maxId = this.tasks
      .map(t => parseInt(t.id.replace('task-', '')))
      .filter(n => !isNaN(n))
      .reduce((max, n) => Math.max(max, n), 0);
    const nextId = maxId + 1;

    const newTask: any = {
      id: 'task-' + nextId,
      name: formValue.name,
      start: this.formatDate(formValue.start),
      end: this.formatDate(formValue.end),
      progress: 0,
      dependencies: (formValue.dependencies || []).join(','),
      equipo: formValue.equipo,
      estatus: formValue.estatus || '2', // Por defecto "En Proceso"
      custom_class: this.getClassByStatus(formValue.estatus || '2')
    };

    this.tasks.push(newTask);

    if (this.gantt) {
      this.gantt.refresh(this.tasks);
      setTimeout(() => { this.applyTaskColors(); }, 100);
    } else {
      this.initGantt();
    }

    this.taskForm.reset();
  }

  // Formatea la fecha a string yyyy-mm-dd para Frappe Gantt
  formatDate(date: Date): string {
    const d = new Date(date);
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const day = d.getDate().toString().padStart(2, "0");
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
  }

  changeView(view: 'Day' | 'Week' | 'Month'): void {
    this.viewMode = view;
    if (this.gantt) {
      this.gantt.change_view_mode(view);
    }
  }
  saveTaskEdit(): void {
    if (this.editForm.invalid) return;

    const index = this.tasks.findIndex(t => t.id === this.selectedTaskId);
    if (index !== -1) {
      const edited = { ...this.tasks[index], ...this.editForm.value };

      // Actualizar custom_class según estatus
      if (edited.estatus) {
        edited.custom_class = this.getClassByStatus(edited.estatus);
      }

      this.tasks[index] = edited;
      if (this.gantt) this.gantt.refresh(this.tasks); setTimeout(() => { this.applyTaskColors(); }, 100);
    }

    this.dialogRef.close();
  }


  openEditDialog(task: any) {
    this.editForm.setValue({
      name: task.name,
      progress: task.progress,
      start: task.start ? new Date(task.start) : null,
      end: task.end ? new Date(task.end) : null,
      equipo: task.equipo || '',
      dependencies: task.dependencies || [],
      estatus: task.estatus || '2'
    });
    this.selectedTaskId = task.id;
    this.selectedTask = task;

    this.dialogRef = this.dialog.open(this.editTaskDialog);
    this.personasSeleccionadadloadGantt();

    this.dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.saveTaskEdit();
      }
      this.selectedTaskId = '';
    });
  }

  closeDialog(task: any) {
    this.dialogRef.close();
  }

  addHoverListeners() {
    const bars = document.querySelectorAll('.bar');
    bars.forEach((bar: Element) => {
      const taskId = bar.getAttribute('data-id');
      const task = this.tasks.find(t => t.id === taskId);

      if (task) {
        bar.addEventListener('mouseenter', (e) => this.showTooltip(e as MouseEvent, task));
        bar.addEventListener('mousemove', (e) => this.moveTooltip(e as MouseEvent));
        bar.addEventListener('mouseleave', () => this.hideTooltip());
      }
    });
  }

  showTooltip(event: MouseEvent, task: any) {
    let tooltip = document.getElementById('gantt-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'gantt-tooltip';
      tooltip.style.position = 'absolute';
      tooltip.style.zIndex = '1000';
      tooltip.style.background = '#fff';
      tooltip.style.border = '1px solid #ccc';
      tooltip.style.padding = '8px';
      tooltip.style.borderRadius = '4px';
      tooltip.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
      tooltip.style.pointerEvents = 'none';
      tooltip.style.fontSize = '12px';
      document.body.appendChild(tooltip);
    }

    tooltip.innerHTML = `
    <strong>${task.name}</strong><br>
    Inicio: ${task.start}<br>
    Fin: ${task.end}<br>
    Progreso: ${task.progress}%
  `;

    tooltip.style.display = 'block';
  }

  moveTooltip(event: MouseEvent) {
    const tooltip = document.getElementById('gantt-tooltip');
    if (tooltip) {
      tooltip.style.top = `${event.pageY + 10}px`;
      tooltip.style.left = `${event.pageX + 10}px`;
    }
  }

  hideTooltip() {
    const tooltip = document.getElementById('gantt-tooltip');
    if (tooltip) {
      tooltip.style.display = 'none';
    }
  }

  deleteTask(): void {
    if (!this.selectedTask) return;
    // Si las tareas están en un array: this.tasks
    this.tasks = this.tasks.filter(t => t.id !== this.selectedTask.id);

    // Vuelve a renderizar el gráfico
    this.initGantt();

    this.dialog.closeAll();
  }

  onTabChange(event: any): void {
    const tabLabel = event.tab.textLabel;

    if (tabLabel === "Gantt Chart") {
      setTimeout(() => {
        this.initGantt();
        this.addHoverListeners();
      }, 300); // Espera breve para asegurar que el DOM esté renderizado
    }
  }

  getNombreArchivoGuardado(categoria: string): string | null {
    const archivo = this.files.find(f => f.categoria.toLowerCase() === categoria.toLowerCase());
    return archivo?.nombreArchivo || null;
  }
  hasArchivoGuardado(categoria: string): boolean {
    return !!this.getNombreArchivoGuardado(categoria);
  }

  descargarArchivoGuardado(categoria: string): void {
    const archivo = this.files.find(f => f.categoria.toLowerCase() === categoria.toLowerCase());
    if (!archivo) return;

    this.downloadFile(archivo.categoria === "cotizacion" ? archivo.cotizacionId : archivo.proyectoId, categoria, archivo.nombreArchivo);
  }
  eliminarArchivo(categoria: string): void {
    const archivo = this.files.find(f => f.categoria.toLowerCase() === categoria.toLowerCase());

    if (!archivo) return;

    Swal.fire({
      title: '¿Estás seguro?',
      text: 'Se eliminará el archivo permanentemente.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.deleteFile(archivo.proyectoId, archivo.categoria, archivo.nombreArchivo);

        // Limpiar referencia local si aplica
        if (categoria === 'ordenCompra') {
          this.ordenCompraFile = null;
        }
        if (categoria === 'fianza') {
          this.fianzaFile = null;
        }
        if (categoria === 'compra') {
          this.compraFile = null;
        }
      }
    });
  }

 historialArchivo(categoria: string): void {
  const archivo = this.files.find(f => f.categoria.toLowerCase() === categoria.toLowerCase());
  console.log('lista usuarios:', this.user);

  if (!archivo) return;

  this.projectService.getArchivoHistorial(archivo.id).subscribe((history) => {
    if (history && history.length > 0) {
      console.log('Historial del archivo:', history);
      this.dialog.open(HistorialComponent, {
        width: '600px',
        data: {
          historial: history,
          usuarios: this.user // 👈 pasamos también los usuarios
        }
      });
    }
  });
}


  /**
 * 1. Obtiene la metadata del archivo.
 * 2. Construye el objeto de configuración del editor de OnlyOffice.
 * 3. Abre un modal para mostrar el editor.
 */
  editarArchivoGuardado(categoria: string): void {
    // 1. Encontrar el archivo
    const archivo = this.files.find(f => f.categoria.toLowerCase() === categoria.toLowerCase());
    if (!archivo) {
      console.error('Archivo no encontrado para editar.');
      return;
    }

    // Determinar el ID a usar (proyectoId o cotizacionId)
    const id = archivo.categoria === "cotizacion" ? archivo.cotizacionId : archivo.proyectoId;

    // Determinar el tipo de documento para OnlyOffice (necesitas una lógica más robusta aquí)
    const fileExtension = archivo.nombreArchivo.split('.').pop();
    const documentType = this.getDocumentType(fileExtension);

    if (!documentType) {
      console.error(`Tipo de documento no soportado para: ${fileExtension}`);
      return;
    }
    // Reemplaza cualquier carácter no alfanumérico por "__", excepto el punto final de la extensión
const safeFileName = archivo.nombreArchivo.replace(/[^a-zA-Z0-9_.-]/g, "__")  // '_' y '-' permitidos
                                         .replace(/\.(?=[^\.]+$)/, "--");     // reemplaza solo el último punto (de la extensión)

    var userID = JSON.parse(localStorage.getItem('userInformation')).usuario.id;                             
    this.projectService.getToken(id, categoria, archivo.nombreArchivo).subscribe((tokenResponse) => {
      if (tokenResponse && tokenResponse.token) {
        console.log('Token obtenido para OnlyOffice:', tokenResponse);
        // 3. Abrir el modal del editor
        this.dialog.open(OnlyOfficeEditorComponent, {
          width: '90vw',
          height: '90vh',
          data: {
            documentServerUrl: this.onlyOfficeDocsUrl,
            editorConfig: {
              document: {
                fileType: fileExtension,
                key: `${archivo.id}_${userID}_${id}_${categoria}_${safeFileName}`, // Clave única para el documento
                title: archivo.nombreArchivo,
                // ✅ Sí codificar aquí (solo en URL del backend)
                url: `${this.onlyOfficeApiUrl}/editfile?proyectoId=${id}&categoria=${categoria}&nombreArchivo=${encodeURIComponent(archivo.nombreArchivo)}`
              },
              documentType: documentType,
              editorConfig: {
                callbackUrl: `${this.onlyOfficeApiUrl}/callback`
              }
            }
          }
        });


      } else {
        console.error('No se pudo obtener el token para OnlyOffice.');
        return;
      }
    });
  }

  getArchivoNombre(categoria: string): string {
    return this[`${categoria}File`]?.name || this.getNombreArchivoGuardado(categoria) || '';
  }

  // Convierte el string anticipoList en array
  obtenerHistorial(): number[] {
    const historialStr = this.projectForm.get('anticipoList')?.value || '';
    return historialStr
      .split(';')
      .filter(x => x.trim() !== '')
      .map(x => parseFloat(x));
  }

  // Calcula el total anticipado
  calcularTotalAnticipos(): number {
    return this.obtenerHistorial().reduce((acc, val) => acc + val, 0);
  }

  // Llamar al guardar para agregar nuevo anticipo
  agregarAnticipo() {
    if (this.nuevoAnticipo != null && this.nuevoAnticipo > 0) {
      let historial = this.projectForm.get('anticipoList')?.value || '';
      historial = historial ? historial + ';' + this.nuevoAnticipo : '' + this.nuevoAnticipo;
      this.projectForm.get('anticipoList')?.setValue(historial);
      this.nuevoAnticipo = null;
    }
  }

  getPagoProgreso(): number {
    const pagoTotal = Number(this.projectForm.get('pagoTotal')?.value) || 0;
    const anticipoListStr = this.projectForm.get('anticipoList')?.value || '';

    if (pagoTotal <= 0 || !anticipoListStr.trim()) {
      return 0; // evita divisiones entre cero o valores vacíos
    }

    // Convertir "100;50;200" → [100, 50, 200] y sumar
    const totalAnticipos = anticipoListStr
      .split(';')
      .map(v => Number(v.trim()) || 0)
      .reduce((acc, val) => acc + val, 0);

    const porcentaje = (totalAnticipos / pagoTotal) * 100;

    // Limitar a máximo 100% para evitar desbordes visuales
    return Math.min(Math.round(porcentaje), 100);
  }

  // Input: solo actualizamos el form control y guardamos el valor literal
  onPagoTotalInput(event: any) {
    const rawValue = this.parseSpanishNumber(event.target.value);
    this.projectForm.get('pagoTotal')?.setValue(rawValue, { emitEvent: false });
    this.pagoTotalDisplay = event.target.value; // No formateamos aquí
  }

  onPagoTotalBlur(event: any) {
    const rawValue = this.projectForm.get('pagoTotal')?.value || 0;
    // Formateamos como MXN al perder foco
    this.pagoTotalDisplay =
      this.currencyPipe.transform(rawValue, 'MXN', 'symbol', '1.2-2', 'es-MX') || '';
  }

  onAnticipoInput(event: any) {
    const rawValue = this.parseSpanishNumber(event.target.value);
    this.projectForm.get('anticipo')?.setValue(rawValue, { emitEvent: false });
    this.nuevoAnticipo = rawValue;
    this.anticipoDisplay = event.target.value;
  }

  onAnticipoBlur(event: any) {
    const rawValue = this.projectForm.get('anticipo')?.value || 0;
    this.anticipoDisplay =
      this.currencyPipe.transform(rawValue, 'MXN', 'symbol', '1.2-2', 'es-MX') || '';
  }

  // Helper para convertir string español a número
  parseSpanishNumber(value: string): number {
    if (!value) return 0;
    const clean = value.replace(/[^0-9.,-]/g, '').replace(/\./g, '').replace(',', '.');
    return parseFloat(clean) || 0;
  }


  getColorByStatus(status: string): string {
    switch (status) {
      case '1':
        return 'verde';
      case '2':
        return 'amarillo';
      case '3':
        return 'naranja';
      case '4':
        return 'rojo';
      default:
        return 'gris';
    }
  }

  // Opcional, solo si el CSS no funciona inmediatamente
  applyTaskColors(): void {
    this.tasks.forEach(task => {
      // 1. Asegúrate de que la clase esté en la tarea
      const cssClass = this.getClassByStatus(task.estatus);

      // 2. Encuentra el elemento de la barra de Gantt por el ID
      const barWrapper = document.querySelector(`.bar-wrapper[data-id="${task.id}"]`);

      if (barWrapper && !barWrapper.classList.contains(cssClass)) {
        // 3. Limpia otras clases de color para evitar conflictos (opcional)
        barWrapper.classList.remove('verde', 'amarillo', 'naranja', 'rojo', 'gris');

        // 4. Añade la nueva clase
        barWrapper.classList.add(cssClass);
      }
    });
  }

  getClassByStatus(status: string): string {
    switch (status) {
      case '1': return 'verde';
      case '2': return 'amarillo';
      case '3': return 'naranja';
      case '4': return 'rojo';
      default: return 'gris';
    }
  }

  /**
 * Función auxiliar para mapear la extensión a un tipo de documento de OnlyOffice
 */
  private getDocumentType(ext: string): 'word' | 'cell' | 'presentation' | null {
    ext = ext?.toLowerCase();
    if (['docx', 'doc', 'odt'].includes(ext)) {
      return 'word';
    }
    if (['xlsx', 'xls', 'ods'].includes(ext)) {
      return 'cell';
    }
    if (['pptx', 'ppt', 'odp'].includes(ext)) {
      return 'presentation';
    }
    return null;
  }

}
