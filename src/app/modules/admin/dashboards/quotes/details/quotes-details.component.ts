import { Component, OnInit, LOCALE_ID, ElementRef, QueryList, ViewChildren } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { QuotesService } from "../quotes.service";
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
import { ChatNotificationService } from "app/shared/components/chat-notification/chat-notification.service";
import { CommonModule } from "@angular/common";
import { CurrencyMaskPipe } from "../../../../../pipes/currency-mask.pipe";
import { ClientsService } from "../../../catalogs/clients/clients.service";
import { ProspectosService } from "../../prospects/prospects.services";
import { debounceTime } from "rxjs";
import { NgxMatSelectSearchModule } from "ngx-mat-select-search";
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';

registerLocaleData(localeEs, 'es');

import { MAT_DATE_LOCALE } from "@angular/material/core";
import { ChangeDetectorRef } from '@angular/core';
import { MatTabsModule } from "@angular/material/tabs";
import { MatIconModule } from "@angular/material/icon";
import Swal from 'sweetalert2';
import { ProjectService } from "../../project/project.service";

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
    MatIconModule
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

  constructor(
    private fb: FormBuilder,
    private quotesService: QuotesService,
    private route: ActivatedRoute,
    public router: Router,
    private clientsService: ClientsService,
    private prospectsService: ProspectosService,
    private _chatNotificationService: ChatNotificationService,
    private cdr: ChangeDetectorRef,
    private projectService: ProjectService,
  ) { }

  ngOnInit(): void {
    this.quotesForm = this.fb.group({
      cotizacionId: [0], // ✅ Debe ser número
      cliente: [0], // 🔹 Cambiar de '' a 0
      prospecto: [0], // 🔹 Cambiar de '' a 0
      usuarioCreadorId: [0, Validators.required], // 🔹 Cambiar de '' a 0
      necesidad: [null, [Validators.required, Validators.maxLength(500)]],
      direccion: [null, [Validators.maxLength(255)]],
      nombreContacto: [null, [Validators.required, Validators.maxLength(255)]],
      telefono: [null, [Validators.maxLength(50)]],
      empresa: [null, [Validators.maxLength(255)]],
      cotizacion: [null, [Validators.maxLength(255)]],
      ordenCompra: [null, [Validators.maxLength(255)]],
      contrato: [null, [Validators.maxLength(255)]],
      proveedor: [null, [Validators.maxLength(255)]],
      vendedor: [null, [Validators.maxLength(255)]],
      fechaEntrega: [null], // ✅ Debe ser Date o null
      rutaCritica: [null, [Validators.maxLength(500)]],
      factura: [null, [Validators.maxLength(255)]],
      pago: [null, Validators.pattern(/^\d+(\.\d{1,2})?$/)], // ✅ Debe ser número o null
      utilidadProgramada: [null, Validators.pattern(/^\d+(\.\d{1,2})?$/)],
      utilidadReal: [null, Validators.pattern(/^\d+(\.\d{1,2})?$/)],
      financiamiento: [null, Validators.pattern(/^\d+(\.\d{1,2})?$/)],
      fechaRegistro: [new Date()], // ✅ Enviar como `Date`
      estatus: [0, [Validators.maxLength(50)]],
      formaPago: [null],
      tiempoEntrega: [null],
      montoTotal: [0],
      ajustesCostos: [null],
      comentarios: [null],
      unidadId: [null]
    });
    this.getEstatus();
    this.getClientes();
    this.getProspects();
    this.getUnidadesDeNegocio();

    const userData = JSON.parse(this.quotesService.userInformation);
    this.quotesForm.get("usuarioCreadorId").setValue(userData.usuario.id);

    this.route.paramMap.subscribe((params) => {
      const id = params.get("id");
      if (!id || id === "new") {
        this.quotesId = null; // Se trata de un nuevo proyecto
      } else {
        this.quotesId = Number(id);
        this.loadQuotes(this.quotesId);
        this.getFilesAll();
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
  }

  getEstatus(): void {
    this.quotesService.getEstatus().subscribe((data) => (this.estatus = data.data));
  }

  loadQuotes(id: number): void {
    this.quotesService.getQuoteById(id).subscribe((res) => {
      if (res) {
        if (res.code == 200) {
          var quotes = res.data;
          this.quotesForm.patchValue({
            cotizacionId: quotes.cotizacionId, // 🔹 Ahora se incluye el ID
            cliente: quotes.cliente,
            prospecto: quotes.prospecto,
            usuarioCreadorId: quotes.usuarioCreadorId,
            necesidad: quotes.necesidad,
            direccion: quotes.direccion,
            nombreContacto: quotes.nombreContacto,
            telefono: quotes.telefono,
            empresa: quotes.empresa,
            cotizacion: quotes.cotizacion,
            ordenCompra: quotes.ordenCompra,
            contrato: quotes.contrato,
            proveedor: quotes.proveedor,
            vendedor: quotes.vendedor,
            fechaEntrega: quotes.fechaEntrega,
            rutaCritica: quotes.rutaCritica,
            factura: quotes.factura,
            pago: quotes.pago,
            utilidadProgramada: quotes.utilidadProgramada,
            utilidadReal: quotes.utilidadReal,
            financiamiento: quotes.financiamiento,
            fechaRegistro: quotes.fechaRegistro,
            estatus: quotes.estatus,
            formaPago: quotes.formaPago,
            tiempoEntrega: quotes.tiempoEntrega,
            montoTotal: quotes.montoTotal,
            ajustesCostos: quotes.ajustesCostos,
            comentarios: quotes.comentarios,
            unidadId: quotes.unidadId
          });
        }
        else {
          this._chatNotificationService.showError("Opps", "Hubo un error en el sistema, contacte al administrador del sistema.", 5000);
        }

      }
    });
  }

  saveQuotes(): void {
    if (this.quotesForm.invalid) {
      this._chatNotificationService.showError("Opps", "Por favor, completa los campos obligatorios", 5000);
      return;
    }

    const quotesData: any = this.quotesForm.value;

    // Función para guardar la cotización (create o update)
    const guardarCotizacion = () => {
      if (this.quotesId) {
        // Actualizar
        quotesData.cotizacionId = this.quotesId;
        this.quotesService.updateQuote(quotesData).subscribe((res) => {
          if (res.code == 200) {
            this.router.navigate(["/dashboards/quote"]);
            this._chatNotificationService.showSuccess('Éxito', 'Cotización actualizada correctamente', 3000);
          } else {
            this._chatNotificationService.showError("Opps", "Hubo un error en el sistema, contacte al administrador del sistema.", 5000);
          }
        });
      } else {
        // Crear nuevo
        this.quotesService.createQuote(quotesData).subscribe((res) => {
          if (res.code == 200) {
            this.router.navigate(["/dashboards/quote"]);
            this._chatNotificationService.showSuccess('Éxito', 'Cotización guardada correctamente', 3000);
          } else {
            this._chatNotificationService.showError("Opps", "Hubo un error en el sistema, contacte al administrador del sistema.", 5000);
          }
        });
      }
    };

    // Si el estatus es 2 (Aprobada), mostrar confirmación
    if (quotesData.estatus == 2) {
      Swal.fire({
        icon: "warning",
        title: "Cotización Aprobada",
        text: "Esta cotización está aprobada y se migrará a proyecto. ¿Desea continuar?",
        showCancelButton: true,
        confirmButtonText: "Sí, guardar",
        cancelButtonText: "Cancelar",
        allowOutsideClick: false
      }).then((result) => {
        if (result.isConfirmed) {
          guardarCotizacion();
        }
      });
    } else {
      // Guardar directamente si no está aprobada
      guardarCotizacion();
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
      if (data && data.direccion) {
        this.quotesForm.patchValue({
          direccion: data.direccion,
        });

        // Forzar la detección de cambios
        this.cdr.detectChanges();
      } else {
        this.quotesForm.patchValue({
          direccion: "",
        });
      }
    });
    // Forzar la detección de cambios
    this.cdr.detectChanges();
  }

  onFileSelected(event: any, tipo: string) {
    const file: File = event.target.files[0];
    if (file && tipo) {
      this.subirArchivo(file, tipo);
    }
  }

  subirArchivo(event: any, categoria: string): void {
    const archivo = event;
    if (!archivo) return;

    const formData = new FormData();
    formData.append("cotizacionId", this.quotesId?.toString() || ""); // asegúrate que esté definido
    formData.append("categoria", categoria);
    formData.append("archivo", archivo);

    this.quotesService.uploadFile(formData).subscribe({
      next: () => {
        this._chatNotificationService.showSuccess('Éxito', 'Archivo subido correctamente.', 3000);
        this.getFilesAll();
      },
      error: (err) => {
        this._chatNotificationService.showError("Opps", "Hubo un error en el sistema, contacte al administrador del sistema.", 5000);
      },
    });
  }

  getFilesAll(): void {
    if (!this.quotesId) return;

    this.quotesService.getFiles(this.quotesId).subscribe((files) => {

      // Mapear los archivos y asignarles un tipo basado en su nombreArchivo
      if (files.length > 0) {
        this.files = files.map((file) => ({
          ...file,
          type: this.getFileType(file.nombreArchivo), // Asigna el tipo basado en el nombreArchivo
        }));
      }
      else {
        this.files = [];
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

  trackByFn(index: number, item: any): any {
    return item.id || index;
  }

  downloadFile(
    quotesId: number,
    categoria: string,
    nombreArchivo: string
  ): void {
    this.quotesService
      .downloadFile(quotesId, categoria, nombreArchivo)
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

  deleteFile(quotesId: number, categoria: string, nombreArchivo: string): void {
    this.quotesService.removeFile(quotesId, categoria, nombreArchivo).subscribe(
      (res) => {
        this._chatNotificationService.showSuccess('Éxito', 'Archivo eliminado correctamente.', 3000);

        // Si necesitas actualizar la lista después de eliminar:
        this.getFilesAll(); // Opcional: recargar lista de archivos
      },
      (error) => {
        this._chatNotificationService.showError("Opps", "Ocurrio un error al eliminar el archivo", 5000);
      }
    );
  }

  getUnidadesDeNegocio(): void {
    this.projectService
      .getUnidadesDeNegocio()
      .subscribe((data) => (this.unidadesDeNegocio = data));
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

    this.downloadFile(archivo.cotizacionId, archivo.categoria, archivo.nombreArchivo);
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
        this.deleteFile(archivo.cotizacionId, archivo.categoria, archivo.nombreArchivo);
      }
    });
  }

  getArchivoNombre(categoria: string): string {
    return this[`${categoria}File`]?.name || this.getNombreArchivoGuardado(categoria) || '';
  }
}
