import { Component, OnInit, LOCALE_ID } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { QuotesService } from "../quotes-products.service";
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
import { MatSnackBar } from "@angular/material/snack-bar";
import { CommonModule } from "@angular/common";
import { CurrencyMaskPipe } from "../../../../../pipes/currency-mask.pipe";
import { ClientsService } from "../../../catalogs/clients/clients.service";
import { ProspectosService } from "../../prospects/prospects.services";
import { debounceTime } from "rxjs";
import { NgxMatSelectSearchModule } from "ngx-mat-select-search";
import { registerLocaleData } from "@angular/common";
import localeEs from "@angular/common/locales/es";
import { MAT_DATE_LOCALE } from "@angular/material/core";
import { ChangeDetectorRef } from "@angular/core";
import { MatTabsModule } from "@angular/material/tabs";
import { MatIconModule } from "@angular/material/icon";
import Swal from "sweetalert2";
import { MatDialog } from "@angular/material/dialog";
import { ProjectService } from "../../project/project.service";
import { AddClientComponent } from "../add-client/add-client.component";
import { MatSlideToggle } from "@angular/material/slide-toggle";
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: "app-quotes-details",
  templateUrl: "./quotes-details.component.html",
  styleUrls: ["./quotes-details.component.scss"],
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
    MatSlideToggle,
    MatTooltipModule
  ],
  providers: [
    { provide: LOCALE_ID, useValue: "es-ES" }, // Idioma general Angular
    { provide: MAT_DATE_LOCALE, useValue: "es-ES" }, // Idioma para Angular Material (como el Datepicker)
  ],
})
export class QuoteDetailsComponent implements OnInit {
  quotesForm: FormGroup;
  estatus: any[] = [];
  unidadesDeNegocio: any[] = [];
  quotesId: number | null = null;

  clienteFiltro = new FormControl("");
  filteredClients: any[] = [];
  clients: any[] = [];

  prospectFiltro = new FormControl("");
  filteredProspects: any[] = [];
  prospects: any[] = [];
  cotizacionFile: File | null = null;
  files: any[] = [];
  selectedClienteId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private quotesService: QuotesService,
    private route: ActivatedRoute,
    public router: Router,
    private clientsService: ClientsService,
    private prospectsService: ProspectosService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog,
    private projectService: ProjectService
  ) {}

  ngOnInit(): void {
    this.quotesForm = this.fb.group({
      cotizacionProductosId: [0], // Cambiar de `cotizacionId` a `cotizacionProductosId`
      clienteId: [0, Validators.required],
      unidadDeNegocioId: [0, Validators.required],
      usuarioId: [0, Validators.required],
      requisitosEspeciales: [false, Validators.required],
      createdDate: [new Date()],
      updatedDate: [null],

      // Datos desnormalizados del cliente
      nombreCliente: [null, [Validators.maxLength(200)]],
      nombreEmpresa: [null, [Validators.maxLength(200)]],
      correo: [null, [Validators.email, Validators.maxLength(200)]],
      telefono: [null, [Validators.maxLength(50)]],
      rfc: [null, [Validators.maxLength(50)]],
      direccionCompleta: [null, [Validators.maxLength(300)]],
      estado: [null, [Validators.maxLength(100)]],
    });
    this.getClientes();
    this.getProspects();

    const userData = JSON.parse(this.quotesService.userInformation);
    this.quotesForm.get("usuarioId").setValue(userData.usuario.id);

    this.route.paramMap.subscribe((params) => {
      const id = params.get("id");
      if (!id || id === "new") {
        this.quotesId = null; // Se trata de un nuevo proyecto
      } else {
        this.quotesId = Number(id);
        this.loadQuotes(this.quotesId);
      }
    });

    // Al cambiar cliente, deshabilita prospecto
    this.quotesForm.get("cliente")?.valueChanges.subscribe((clienteId) => {
      const prospectoControl = this.quotesForm.get("prospecto");
      if (clienteId) {
        prospectoControl?.disable({ emitEvent: false });
        prospectoControl?.reset(); // Limpia selección
      } else {
        prospectoControl?.enable({ emitEvent: false });
      }
    });

    // Al cambiar prospecto, deshabilita cliente
    this.quotesForm.get("prospecto")?.valueChanges.subscribe((prospectoId) => {
      const clienteControl = this.quotesForm.get("cliente");
      if (prospectoId) {
        clienteControl?.disable({ emitEvent: false });
        clienteControl?.reset(); // Limpia selección
      } else {
        clienteControl?.enable({ emitEvent: false });
      }
    });

    this.getUnidadesDeNegocio();

    this.quotesForm
      .get("clienteId")
      ?.valueChanges.subscribe((clienteId: number | null) => {
        this.selectedClienteId = clienteId;
      });
  }

  loadQuotes(id: number): void {
    this.quotesService.getQuoteById(id).subscribe((res) => {
      if (res && res.code === 200) {
        const quotes = res.data;

        this.quotesForm.patchValue({
          cotizacionProductosId: quotes.cotizacionProductosId,
          clienteId: quotes.clienteId,
          unidadDeNegocioId: quotes.unidadDeNegocioId,
          usuarioId: quotes.usuarioId,
          requisitosEspeciales: quotes.requisitosEspeciales,
          createdDate: quotes.createdDate,
          updatedDate: quotes.updatedDate,

          // Datos del cliente desnormalizados
          nombreCliente: quotes.nombreCliente,
          nombreEmpresa: quotes.nombreEmpresa,
          correo: quotes.correo,
          telefono: quotes.telefono,
          rfc: quotes.rfc,
          direccionCompleta: quotes.direccionCompleta,
          estado: quotes.estado,
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Opps",
          text: "Hubo un error en el sistema, contacte al administrador del sistema.",
          draggable: true,
        });
      }
    });
  }

  saveQuotes(): void {
    if (this.quotesForm.invalid) {
      Swal.fire({
        icon: "error",
        title: "Opps",
        text: "Por favor, completa los campos obligatorios",
        draggable: true,
      });
      return;
    }

    const quotesData: any = this.quotesForm.value;

    if (this.quotesId) {
      // Actualizar proyecto
      quotesData.cotizacionProductosId = this.quotesId;
      this.quotesService.saveQuote(quotesData).subscribe((res) => {
        if (res.code == 200) {
          // Redirigir a la lista de proyectos
          this.router.navigate(["/dashboards/quote-products"]); // O la ruta correspondiente a la lista
          this.snackBar.open("Cotizacion actualizada correctamente", "Cerrar", {
            duration: 3000,
          });
        } else {
          Swal.fire({
            icon: "error",
            title: "Opps",
            text: "Hubo un error en el sistema, contacte al administrador del sistema.",
            draggable: true,
          });
        }
      });
    } else {
      // Crear nuevo proyecto
      this.quotesService.saveQuote(quotesData).subscribe((res) => {
        if (res.code == 200) {
          // Redirigir a la lista de proyectos
          this.router.navigate(["/dashboards/quote-products"]); // O la ruta correspondiente a la lista
          this.snackBar.open("Cotizacion guardada correctamente", "Cerrar", {
            duration: 3000,
          });
        } else {
          Swal.fire({
            icon: "error",
            title: "Opps",
            text: "Hubo un error en el sistema, contacte al administrador del sistema.",
            draggable: true,
          });
        }
      });
    }
  }

  updateValue(event: Event, controlName: string) {
    let input = event.target as HTMLInputElement;

    // Remover caracteres no numéricos excepto el punto decimal
    let rawValue = input.value.replace(/[^0-9.]/g, "");

    // Actualizar el FormControl dinámicamente
    this.quotesForm.get(controlName)?.setValue(rawValue);
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

  getProspects(): void {
    this.prospectsService.getProspectos().subscribe((res: any) => {
      this.prospects = res.data;
      this.filteredProspects = this.prospects;

      // Suscribirse al filtro con debounce
      this.prospectFiltro.valueChanges
        .pipe(debounceTime(200))
        .subscribe((value: string) => {
          const filterValue = value?.toLowerCase() || "";
          this.filteredProspects = this.prospects.filter((prospect) =>
            `${prospect.prospectoId} - ${prospect.empresa}`
              .toLowerCase()
              .includes(filterValue)
          );
        });
    });
  }

  onClienteSelected(cliente: any): void {
    this.clientsService.getClientById(cliente).subscribe((data) => {
      console.log("Cliente seleccionado:", data);
      if (data) {
        this.quotesForm.patchValue({
          direccionCompleta: data.direccion || "",
          nombreCliente: data.nombre || "",
          nombreEmpresa: data.empresa || "",
          correo: data.email || "",
          telefono: data.telefono || "",
          rfc: data.rfc || "",
          estado: data.estado || "",
        });

        // Forzar la detección de cambios
        this.cdr.detectChanges();
      }
    });
    // Forzar la detección de cambios
    this.cdr.detectChanges();
  }

  abrirModalCliente(event: MouseEvent): void {
    event.stopPropagation();

    const clienteId = this.quotesForm.get('clienteId')?.value;

    const dialogRef = this.dialog.open(AddClientComponent, {
      width: "600px",
      data: {
      clienteId: clienteId > 0 ? clienteId : null
    }
    });

    dialogRef.afterClosed().subscribe((nuevoCliente) => {
      if (nuevoCliente) {
        // Si se ha creado un nuevo cliente, actualiza la lista de clientes
        this.getClientes();
        // Selecciona el nuevo cliente en el formulario
        this.quotesForm.get("cliente")?.setValue(nuevoCliente.clienteId);
        this.onClienteSelected(nuevoCliente.clienteId);
      }
    });
  }

  getUnidadesDeNegocio(): void {
    this.projectService
      .getUnidadesDeNegocio()
      .subscribe((data) => (this.unidadesDeNegocio = data));
  }

  clearClienteSeleccionado(): void {
  this.quotesForm.get('clienteId')?.setValue(null);
  this.selectedClienteId = null;
}
}
