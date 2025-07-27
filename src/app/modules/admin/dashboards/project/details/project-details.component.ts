import {
  Component,
  OnInit,
  LOCALE_ID,
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectorRef,
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
  ],
  providers: [
    { provide: LOCALE_ID, useValue: "es-ES" }, // Idioma general Angular
    { provide: MAT_DATE_LOCALE, useValue: "es-ES" }, // Idioma para Angular Material (como el Datepicker)
  ],
})
export class ProjectDetailsComponent implements OnInit {
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

      cliente: [0, [Validators.required, this.noZeroValidator]], // int? pero requerido
      necesidad: [null],
      direccion: [null],
      nombreContacto: [null],
      telefono: [null],
      empresa: [null],

      levantamiento: [null],
      planoArquitectonico: [null],
      diagramaIsometrico: [null],
      diagramaUnifilar: [null],

      materialesCatalogo: [null],
      materialesPresupuestados: [null],
      inventarioFinal: [null],
      cuadroComparativo: [null],

      proveedor: [null],

      manoDeObra: [null],
      personasParticipantes: [null],
      equipos: [null],
      herramientas: [null],

      indirectosCostos: [0],
      fianzas: [0],
      anticipo: [0],
      cotizacion: [0],

      ordenDeCompra: [null],
      contrato: [null],

      programaDeTrabajo: [null],
      avancesReportes: [null],
      comentarios: [null],
      hallazgos: [null],
      dosier: [null],
      rutaCritica: [null],

      factura: [null],
      pago: [0],
      utilidadProgramada: [0],
      utilidadReal: [0],
      financiamiento: [0],

      cierreProyectoActaEntrega: [null],
      estatus: [0, [Validators.required, this.noZeroValidator]],

      liderProyectoId: [null],
      entregables: [null],
      cronograma: [null],
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
          });
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


    const projectData: any = {
      ...this.projectForm.value,
      ganttTasks: this.tasks.map(task => ({
        id: null, // puede ser undefined para nuevas
        name: task.name,
        startDate: task.start instanceof Date ? task.start.toISOString() : task.start,
        endDate: task.end instanceof Date ? task.end.toISOString() : task.end,
        progress: task.progress ?? 0,
        dependencies: task.dependencies?.join(",") ?? "",
        equipo: task.equipo ?? "",
        TempId: task.id // Mantener el ID temporal para referencia
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
        return
      }
      const allFiles = files.map((file) => ({
        ...file,
        type: this.getFileType(file.nombreArchivo),
      }));
      if (allFiles && allFiles.length > 0) {
        // Separar los archivos
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

  onFileSelectedOne(event: Event, tipo: string) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];

    if (tipo === 'ordenCompra') {
      this.ordenCompraFile = file;
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
    }
  });
}

}
