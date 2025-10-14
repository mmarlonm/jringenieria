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
import { set } from "lodash";
import { MatSnackBar } from '@angular/material/snack-bar'; // Asegúrate de tenerlo importado
import Swal from 'sweetalert2';
import Gantt from "frappe-gantt";
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { TemplateRef, ViewChild } from '@angular/core';
import { NeumorphicProgressComponent } from '@fuse/components/neumorphic-progress/neumorphic-progress.component';
import { CurrencyPipe } from '@angular/common';

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
    NeumorphicProgressComponent
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

  // Control de búsqueda de personas
  personasControl = new FormControl();
  filteredUsers: Observable<any[]>; // Lista filtrada de usuarios
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
    { key: 'compraMateriales', label: 'Compra de materiales' },
    { key: 'equiposHerramientas', label: 'Equipos/Herramientas' },
    { key: 'reportes', label: 'Reportes' },
    { key: 'almacenCampo', label: 'Almacén en campo' },
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
  }

  ngOnInit(): void {
    this.projectForm = this.fb.group({
      proyectoId: [0],
      nombre: [null, Validators.required],
      categoria: [null, Validators.required],
      lugar: ["NA"],
      unidadDeNegocio: [null, Validators.required],
      fechaInicio: [null, Validators.required],
      fechaFin: [null],
      estado: ["NA"],

      cliente: [0, [Validators.required, this.noZeroValidator]],
      necesidad: [null],
      direccion: [null],

      // --- CONTACTOS ---
      nombreContacto: [null],
      telefono: [null],
      empresa: [null],

      // Nuevos campos agregados
      nombreContactoResponsable: [null],
      telefonoResponsable: [null],
      empresaResponsable: [null],
      nombreContactoSupervisor: [null],
      telefonoSupervisor: [null],
      empresaSupervisor: [null],

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

      // --- CIERRE ---
      cierreProyectoActaEntrega: [null],
      estatus: [0, [Validators.required, this.noZeroValidator]],

      liderProyectoId: [null],
      entregables: [null],
      cronograma: [null],
      pagoTotal: [0],
      anticipoList: [0]
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
          console.log("Progreso inicial:", this.progressValue);
        }, 1000); // Espera un poco para que se cargue el Gantt
      }
    });

    this.taskForm = this.fb.group({
      name: ["", Validators.required],
      start: [null, Validators.required],
      end: [null, Validators.required],
      equipo: [null],
      dependencies: [[]], // como array inicialmente
    });


    this.editForm = this.fb.group({
      name: ["", Validators.required],
      progress: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      start: [null],
      end: [null],
      equipo: [''],
      dependencies: ['']
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
    if (!container) {
      console.error("No se encontró el contenedor Gantt");
      return;
    }

    // Limpiar contenido anterior para evitar duplicados o errores visuales
    container.innerHTML = "";

    // Si previamente añadiste listener global de input, remuévelo para evitar duplicados
    // Para hacerlo correctamente deberías guardar la referencia del handler
    // Aquí asumimos que sólo se llama initGantt una vez o se controla de otra forma

    this.gantt = new Gantt(container, this.tasks, {
      view_mode: this.viewMode,
      language: 'es',
      popup: '',
      on_click: (task) => {
        const foundTask = this.tasks.find(t => t.id === task.id);
        if (!foundTask) return;
        console.log("Tarea encontrada:", foundTask);
        this.selectedTaskId = task.id;
        this.editForm.setValue({
          name: foundTask.name,
          progress: foundTask.progress,
          start: foundTask.start ? new Date(foundTask.start) : null,
          end: foundTask.end ? new Date(foundTask.end) : null,
          equipo: foundTask.equipo || '',
          dependencies: foundTask.dependencies || []
        });

        this.openEditDialog(task);
      },

      on_date_change: (task, start, end) => {
        console.log("Fecha cambiada:", task, start, end);
      },
      on_progress_change: (task, progress) => {
        console.log("Progreso cambiado:", task, progress);
      },
      on_view_change: (mode) => {
        console.log("Modo de vista cambiado:", mode);
      },
    });

    setTimeout(() => {
      this.addHoverListeners();
    }, 100); // Esperamos que el DOM renderice

    // Agregar listener global solo UNA vez para evitar multiples listeners.
    // Para eso, verificamos si ya está agregado, si no, lo agregamos:
    if (!container.hasAttribute('data-progress-listener')) {
      container.addEventListener("input", (event) => {
        const target = event.target as HTMLInputElement;
        if (target && target.type === "range" && target.id.startsWith("progress-input-")) {
          const taskId = target.id.replace("progress-input-", "");
          const newProgress = Number(target.value);

          // Actualiza el span con el valor actual
          const span = document.getElementById(`${target.id}-value`);
          if (span) span.textContent = newProgress.toString();

          // Actualiza progreso en el gantt
          if (this.gantt) {
            this.gantt.progress(taskId, newProgress);
            console.log(`Progreso actualizado para tarea ${taskId}: ${newProgress}%`);
          }
        }
      });
      container.setAttribute('data-progress-listener', 'true');
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
          dependencies: task.dependencies ? task.dependencies.split(',') : []
        }));

        if (project) {
          this.projectForm.patchValue({
            proyectoId: project.proyectoId, // 🔹 Ahora se incluye el ID
            nombre: project.nombre,
            categoria: project.categoriaId,
            lugar: project.lugar,
            unidadDeNegocio: project.unidadDeNegocioId,
            fechaInicio: project.fechaInicio,
            fechaFin: project.fechaFin,
            estado: project.estado,

            // Nuevas propiedades
            cliente: project.cliente,
            necesidad: project.necesidad,
            direccion: project.direccion,
            nombreContacto: project.nombreContacto,
            telefono: project.telefono,
            empresa: project.empresa,

            levantamiento: project.levantamiento,
            planoArquitectonico: project.planoArquitectonico,
            diagramaIsometrico: project.diagramaIsometrico,
            diagramaUnifilar: project.diagramaUnifilar,

            materialesCatalogo: project.materialesCatalogo,
            materialesPresupuestados: project.materialesPresupuestados,
            inventarioFinal: project.inventarioFinal,
            cuadroComparativo: project.cuadroComparativo,

            proveedor: project.proveedor,

            manoDeObra: project.manoDeObra,
            personasParticipantes: project.personasParticipantes,
            equipos: project.equipos,
            herramientas: project.herramientas,

            indirectosCostos: project.indirectosCostos,
            fianzas: project.fianzas,
            anticipo: project.anticipo,
            cotizacion: project.cotizacion,

            ordenDeCompra: project.ordenDeCompra,
            contrato: project.contrato,

            programaDeTrabajo: project.programaDeTrabajo,
            avancesReportes: project.avancesReportes,
            comentarios: project.comentarios,
            hallazgos: project.hallazgos,
            dosier: project.dosier,
            rutaCritica: project.rutaCritica,

            factura: project.factura,
            pago: project.pago,
            utilidadProgramada: project.utilidadProgramada,
            utilidadReal: project.utilidadReal,
            financiamiento: project.financiamiento,

            cierreProyectoActaEntrega: project.cierreProyectoActaEntrega,
            estatus: project.estatus,
            liderProyectoId: project.liderProyectoId,
            entregables: project.entregables,
            cronograma: project.cronograma,
            pagoTotal: project.pagoTotal || 0,
            anticipoList: project.anticipoList || 0
          });

          const pagoTotal = project.pagoTotal || 0;
          this.pagoTotalDisplay = this.currencyPipe.transform(pagoTotal, 'MXN', 'symbol', '1.2-2') || '';
          // Convertir "100;50;200" → [100, 50, 200] y sumar
          const totalAnticipos = project.anticipoList
            .split(';')
            .map(v => Number(v.trim()) || 0)
            .reduce((acc, val) => acc + val, 0);
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
        TempId: task.id
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

  deleteFile(proyectoId: number, categoria: string, nombreArchivo: string): void {
    this.projectService.removeFile(proyectoId, categoria, nombreArchivo).subscribe({
      next: (res: any) => {
        console.log(res);
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

  addTask(): void {
    if (this.taskForm.invalid) return;

    const formValue = this.taskForm.value;

    // Obtener el número más alto de ID actual
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
      equipo: formValue.equipo
    };

    this.tasks.push(newTask);

    if (this.gantt) {
      this.gantt.refresh(this.tasks);
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
  saveTaskEdit() {
    if (this.editForm.invalid) return;

    const index = this.tasks.findIndex(t => t.id === this.selectedTaskId);
    if (index !== -1) {
      this.tasks[index] = {
        ...this.tasks[index],
        ...this.editForm.value
      };
      this.gantt.refresh(this.tasks);
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
      dependencies: task.dependencies || []
    });
    this.selectedTaskId = task.id;
    this.selectedTask = task;

    this.dialogRef = this.dialog.open(this.editTaskDialog);

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
    console.log("Eliminando tarea:", this.selectedTask);
    console.log("Tareas antes de eliminar:", this.tasks);
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

    this.downloadFile(archivo.proyectoId, archivo.categoria, archivo.nombreArchivo);
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

  onPagoTotalInput(event: any) {
    const rawValue = this.cleanNumber(event.target.value);
    this.projectForm.get('pagoTotal')?.setValue(rawValue);
    this.pagoTotalDisplay = event.target.value;
  }

  onPagoTotalBlur(event: any) {
    const rawValue = this.cleanNumber(event.target.value);
    this.pagoTotalDisplay = this.currencyPipe.transform(rawValue, 'MXN', 'symbol', '1.2-2') || '';
  }

  onAnticipoInput(event: any) {
    const rawValue = this.cleanNumber(event.target.value);
    this.nuevoAnticipo = rawValue;
    this.anticipoDisplay = event.target.value;
  }

  onAnticipoBlur(event: any) {
    const rawValue = this.cleanNumber(event.target.value);
    this.anticipoDisplay = this.currencyPipe.transform(rawValue, 'MXN', 'symbol', '1.2-2') || '';
  }

  // Utilidad para limpiar valores
  private cleanNumber(value: string): number {
    return parseFloat(value.replace(/[^0-9.-]+/g, '')) || 0;
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

}
