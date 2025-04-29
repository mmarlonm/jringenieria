import {
  Component,
  OnInit,
  LOCALE_ID,
  CUSTOM_ELEMENTS_SCHEMA,
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

  constructor(
    private fb: FormBuilder,
    private projectService: ProjectService,
    private route: ActivatedRoute,
    public router: Router,
    private clientsService: ClientsService,
    private _usersService: UsersService,
    private snackBar: MatSnackBar
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
        this.disabledArchivos=false;
      }
    });
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
      if(projects.code==200){
        const project = projects.data;
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
    }else{
      Swal.fire({
                  icon: "error",
                  title:"Opps",
                  text:"Hubo un error en el sistema, contacte al administrador del sistema.",
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
    if (this.projectForm.invalid){
     Swal.fire({
                       icon: "error",
                       title:"Opps",
                       text:"Por favor, completa los campos obligatorios",
                       draggable: true
                     });   
                     return;                   
                    }
    

    const projectData: any = this.projectForm.value;

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

      if(files == null){
        this.files = [];
        this.filesEvidencias = [];
        return
      }
      const allFiles = files.map((file) => ({
        ...file,
        type: this.getFileType(file.nombreArchivo),
      }));
      if(allFiles && allFiles.length > 0){
        // Separar los archivos
      this.filesEvidencias = allFiles.filter(f => f.categoria.toLowerCase() === 'evidencias');
      this.files = allFiles.filter(f => f.categoria.toLowerCase() !== 'evidencias');
      }else{
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
        if(res.code==200){
        this.snackBar.open('Archivo subido correctamente.', 'Cerrar', {
          duration: 3000,
          panelClass: ['snackbar-success']
        });
        this.getFilesAll();
      }
    else{
      Swal.fire({
                  icon: "error",
                  title:"Opps",
                  text:"Hubo un error en el sistema, contacte al administrador del sistema.",
                  draggable: true
                });
      
    }
    },
      error: (err) => {
        Swal.fire({
                    icon: "error",
                    title:"Opps",
                    text:"Hubo un error en el sistema, contacte al administrador del sistema.",
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
    this.projectService.removeFile(proyectoId, categoria, nombreArchivo).subscribe(
      (res:any) => {
        if(res.code==200){
        
        this.snackBar.open('Archivo eliminado correctamente.', 'Cerrar', {
          duration: 3000,
          panelClass: ['snackbar-success']
        });
  
        // Si necesitas actualizar la lista después de eliminar:
        this.getFilesAll(); // Opcional: recargar lista de archivos
      }else{
       Swal.fire({
                   icon: "error",
                   title:"Opps",
                   text:"Hubo un error en el sistema, contacte al administrador del sistema.",
                   draggable: true
                 });
       

      }
      },
      (error) => {
        Swal.fire({
                    icon: "error",
                    title:"Opps",
                    text:"Hubo un error en el sistema, contacte al administrador del sistema.",
                    draggable: true
                  });
        
      }
    );
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
}
