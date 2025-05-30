import { Component, OnInit, LOCALE_ID } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { ProspectosService } from "../prospects.services";
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule,
  FormControl,
} from "@angular/forms";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatButtonModule } from "@angular/material/button";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatNativeDateModule } from "@angular/material/core";
import { CommonModule } from "@angular/common";
import { CurrencyMaskPipe } from "../../../../../pipes/currency-mask.pipe";
import { ClientsService } from "../../../catalogs/clients/clients.service";
import { debounceTime } from "rxjs";
import { NgxMatSelectSearchModule } from "ngx-mat-select-search";
import { registerLocaleData } from "@angular/common";
import localeEs from "@angular/common/locales/es";
import { MAT_DATE_LOCALE } from "@angular/material/core";
import { UsersService } from "../../../security/users/users.service";
import { MatTabsModule } from "@angular/material/tabs";
import { MatIconModule } from "@angular/material/icon";
import { NotesDetailsComponent } from "../dialog/dialog.component";
import { MatDialog } from "@angular/material/dialog";
import Swal from 'sweetalert2';


@Component({
  selector: "app-prospects-details",
  templateUrl: "./prospects-details.component.html",
  styleUrls: ["./prospects-details.component.scss"],
  
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
    CurrencyMaskPipe,
    NgxMatSelectSearchModule,
    MatTabsModule,
    MatIconModule,
  ],
  providers: [
    { provide: LOCALE_ID, useValue: "es-ES" }, // Idioma general Angular
    { provide: MAT_DATE_LOCALE, useValue: "es-ES" }, // Idioma para Angular Material (como el Datepicker)
  ],
})
export class ProspectDetailsComponent implements OnInit {
  prospectForm: FormGroup;
  estatus: any[] = [];
  unidadesDeNegocio: any[] = [];
  prospectsId: number | null = null;

  clienteFiltro = new FormControl("");
  filteredClients: any[] = [];
  clients: any[] = [];
  opcionesContacto: string[] = [
    "Web",
    "Facebook",
    "Instagram",
    "Twitter",
    "LinkedIn",
    "Recomendación",
    "Eventos",
    "Otros",
  ];
  mostrarCampoOtros: boolean = false;

  //informacion de usuario logeado
  user: any[] = [];
  notes: any[] = []; // Lista de notas

  searchText: string = '';
  usuarioId :number;

  constructor(
    private fb: FormBuilder,
    private prospectosService: ProspectosService,
    private route: ActivatedRoute,
    public router: Router,
    private clientsService: ClientsService,
    private _usersService: UsersService,
    private _matDialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.prospectForm = this.fb.group({
      prospectoId: [0], // ID del prospecto (0 cuando es nuevo)
      empresa: ["", [Validators.required, Validators.maxLength(255)]],
      contacto: ["", [Validators.required, Validators.maxLength(255)]],
      telefono: ["", [Validators.required, Validators.maxLength(50)]],
      puesto: ["", [Validators.maxLength(100)]],
      giroEmpresa: ["", [Validators.maxLength(255)]],
      email: ["", [Validators.email, Validators.maxLength(255)]],
      areaInteres: ["", [Validators.maxLength(255)]],
      tipoEmpresa: ["", [Validators.maxLength(255)]],
      usuarioId: [0, Validators.required], // ID del usuario que lo creó
      comoSeObtuvo: [""],
      otros: [""],
      personalSeguimiento: [null],
    });

    // Verificar si "Otros" ya está seleccionado al cargar el formulario
    this.mostrarCampoOtros =
      this.prospectForm.get("comoSeObtuvo")?.value === "Otros";

    const userData = JSON.parse(this.prospectosService.userInformation);
    this.usuarioId = userData.usuario.id;
    this.prospectForm.get("usuarioId").setValue(userData.usuario.id);

    this.route.paramMap.subscribe((params) => {
      const id = params.get("id");
      if (!id || id === "new") {
        this.prospectsId = null; // Se trata de un nuevo proyecto
      } else {
        this.prospectsId = Number(id);
        this.loadProspects(this.prospectsId);
        this.loadNotes(this.prospectsId); // Cargar notas relacionadas
      }
    });

    this.getUsers();
  }

  loadProspects(id: number): void {
    this.prospectosService.getProspectoById(id).subscribe((res) => {
      if(res.code==200){
      var prospecto = res.data
      if (prospecto) {
        // Verifica si "comoSeObtuvo" es "Otros" para activar el campo de texto adicional
        this.mostrarCampoOtros =
          prospecto.comoSeObtuvo === "Otros" ? true : false;
        this.prospectForm.patchValue({
          prospectoId: prospecto.prospectoId,
          empresa: prospecto.empresa,
          contacto: prospecto.contacto,
          telefono: prospecto.telefono,
          puesto: prospecto.puesto,
          giroEmpresa: prospecto.giroEmpresa,
          email: prospecto.email,
          areaInteres: prospecto.areaInteres,
          tipoEmpresa: prospecto.tipoEmpresa,
          usuarioId: prospecto.usuarioId,
          comoSeObtuvo: prospecto.comoSeObtuvo,
          otros: prospecto.otros,
          personalSeguimiento: prospecto.personalSeguimiento,
        });
      }
      }
      else{
        Swal.fire({
                   icon: "error",
                   title:"Opps",
                   text:"Hubo un error en el sistema, contacte al administrador del sistema.",
                   draggable: true
                 });
     }
    });
  }

  // Cargar notas del prospecto
  loadNotes(prospectId: number): void {
    this.prospectosService.getNotas(prospectId).subscribe((notes) => {
      this.notes = notes;
    });
  }

  saveProspect(): void {
    if (this.prospectForm.invalid){
           Swal.fire({
                                 icon: "error",
                                 title:"Opps",
                                 text:"Por favor, completa los campos obligatorios",
                                 draggable: true
                               });   
                               return;                   
    }

    const quotesData: any = this.prospectForm.value;

    if (this.prospectsId) {
      // Actualizar proyecto
      quotesData.prospectoId = this.prospectsId;
    }

    this.prospectosService.saveProspecto(quotesData).subscribe((res) => {
      if(res.code==200){  
      // Redirigir a la lista de proyectos
      this.router.navigate(["/dashboards/prospects"]); // O la ruta correspondiente a la lista
      }
      else{
        Swal.fire({
          icon: "error",
          title:"Opps",
          text:"Hubo un error en el sistema, contacte al administrador del sistema.",
          draggable: true
        });
      } 
    });
  }

  updateValue(event: Event, controlName: string) {
    let input = event.target as HTMLInputElement;

    // Remover caracteres no numéricos excepto el punto decimal
    let rawValue = input.value.replace(/[^0-9.]/g, "");

    // Actualizar el FormControl dinámicamente
    this.prospectForm.get(controlName)?.setValue(rawValue);
  }

  onComoSeObtuvoChange(value: string) {
    this.mostrarCampoOtros = value === "Otros";
    if (!this.mostrarCampoOtros) {
      this.prospectForm.get("otros")?.setValue(""); // Limpiar campo si no es "Otros"
    }
  }

  getUsers(): void {
    this._usersService.getUsers().subscribe((users) => {
      this.user = users.filter(
        (user) => user.rolId !== 1 && user.rolId !== 3 && user.activo !== false
      );
    });
  }

  // Abrir modal para agregar una nueva nota
  addNewNote(): void {
    const dialogRef = this._matDialog.open(NotesDetailsComponent, {
      autoFocus: false,
      data: { note: { idNote: 0, title: "", content: "" } },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        result.prospectoId = this.prospectsId; // Vincular la nota al prospecto
        result.usuarioId = this.usuarioId;
        this.notes.push(result); // Agregar la nueva nota a la lista
        this.prospectosService.saveNote(result).subscribe();
      }
    });
  }

  // Abrir modal para editar una nota existente
  editNote(note: any): void {
    const dialogRef = this._matDialog.open(NotesDetailsComponent, {
      autoFocus: false,
      data: { note },
    });

    dialogRef.afterClosed().subscribe((updatedNote) => {
      if (updatedNote) {
        const index = this.notes.findIndex(n => n.idNote === updatedNote.idNote);
        if (index !== -1) {
          this.notes[index] = updatedNote; // Actualizar la nota en la lista
          this.prospectosService.saveNote(updatedNote).subscribe();
        }
      }
    });
  }

  // Eliminar una nota
  deleteNote(noteId: number): void {
    this.notes = this.notes.filter(n => n.idNote !== noteId);
    this.prospectosService.deleteNote(noteId).subscribe(res => {
      this.loadNotes(this.prospectsId);
    });
  }

  get filteredNotes() {
    return this.notes.filter((note) =>
      note.title.toLowerCase().includes(this.searchText.toLowerCase()) ||
      note.content.toLowerCase().includes(this.searchText.toLowerCase())
    );
  }
}
