import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SubcontratacionService, SubcontratistaEmpresa, SubcontratistaPersonal } from '../subcontratacion.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-subcontratacion',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MatButtonModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatTooltipModule
    ],
    templateUrl: './subcontratacion.component.html'
})
export class SubcontratacionComponent implements OnInit {
    empresas: SubcontratistaEmpresa[] = [];
    personalList: SubcontratistaPersonal[] = [];

    empresaForm: FormGroup;
    personalForm: FormGroup;

    showEmpresaForm = false;
    showPersonalForm = false;

    editingEmpresaId: number | null = null;
    editingPersonalId: number | null = null;

    constructor(
        private _fb: FormBuilder,
        private _subService: SubcontratacionService
    ) {}

    ngOnInit(): void {
        this.initForms();
        this.loadEmpresas();
        this.loadPersonal();
    }

    initForms(): void {
        this.empresaForm = this._fb.group({
            idSubcontratista: [0],
            nombreEmpresa: ['', [Validators.required, Validators.maxLength(255)]],
            activa: [true]
        });

        this.personalForm = this._fb.group({
            idPersonal: [0],
            idSubcontratista: ['', [Validators.required]],
            nombre: ['', [Validators.required, Validators.maxLength(255)]],
            correo: ['', [Validators.email, Validators.maxLength(255)]],
            numero: ['', [Validators.maxLength(50)]],
            activo: [true]
        });
    }

    // Cargar Datos
    loadEmpresas(): void {
        this._subService.getEmpresas().subscribe({
            next: (res) => this.empresas = res || [],
            error: (err) => console.error(err)
        });
    }

    loadPersonal(): void {
        this._subService.getPersonal().subscribe({
            next: (res) => this.personalList = res || [],
            error: (err) => console.error(err)
        });
    }

    // CRUD Empresas
    toggleEmpresaForm(edit = false, emp?: SubcontratistaEmpresa): void {
        this.showEmpresaForm = !this.showEmpresaForm;
        if (this.showEmpresaForm) {
            if (edit && emp) {
                this.editingEmpresaId = emp.idSubcontratista;
                this.empresaForm.patchValue(emp);
            } else {
                this.editingEmpresaId = null;
                this.empresaForm.reset({ idSubcontratista: 0, nombreEmpresa: '', activa: true });
            }
        }
    }

    saveEmpresa(): void {
        if (this.empresaForm.invalid) return;

        const val = this.empresaForm.value;
        this._subService.guardarEmpresa(val).subscribe({
            next: () => {
                Swal.fire({
                    title: '¡Guardado!',
                    text: 'Empresa subcontratista guardada con éxito.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
                this.showEmpresaForm = false;
                this.loadEmpresas();
            },
            error: (err) => {
                console.error(err);
                Swal.fire('Error', 'No se pudo guardar la empresa.', 'error');
            }
        });
    }

    deleteEmpresa(emp: SubcontratistaEmpresa): void {
        Swal.fire({
            title: '¿Eliminar empresa?',
            text: `¿Estás seguro de eliminar a "${emp.nombreEmpresa}"? Esto eliminará también a todo su personal.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            reverseButtons: true,
            buttonsStyling: false,
            customClass: {
                popup: 'rounded-3xl p-6 shadow-2xl border-0',
                confirmButton: 'inline-flex items-center justify-center px-6 py-3 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-all duration-300 mx-2 shadow-lg shadow-red-200',
                cancelButton: 'inline-flex items-center justify-center px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-500 text-sm font-bold rounded-xl transition-all duration-300 mx-2'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                this._subService.eliminarEmpresa(emp.idSubcontratista).subscribe({
                    next: () => {
                        Swal.fire({
                            title: '¡Eliminado!',
                            text: 'La empresa y su personal han sido eliminados.',
                            icon: 'success',
                            timer: 1500,
                            showConfirmButton: false
                        });
                        this.loadEmpresas();
                        this.loadPersonal();
                    },
                    error: (err) => {
                        console.error(err);
                        Swal.fire('Error', 'No se pudo eliminar la empresa.', 'error');
                    }
                });
            }
        });
    }

    // CRUD Personal
    togglePersonalForm(edit = false, per?: SubcontratistaPersonal): void {
        this.showPersonalForm = !this.showPersonalForm;
        if (this.showPersonalForm) {
            if (edit && per) {
                this.editingPersonalId = per.idPersonal;
                this.personalForm.patchValue(per);
            } else {
                this.editingPersonalId = null;
                this.personalForm.reset({ idPersonal: 0, idSubcontratista: '', nombre: '', correo: '', numero: '', activo: true });
            }
        }
    }

    savePersonal(): void {
        if (this.personalForm.invalid) return;

        const val = this.personalForm.value;
        this._subService.guardarPersonal(val).subscribe({
            next: () => {
                Swal.fire({
                    title: '¡Guardado!',
                    text: 'Personal guardado con éxito.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
                this.showPersonalForm = false;
                this.loadPersonal();
            },
            error: (err) => {
                console.error(err);
                Swal.fire('Error', 'No se pudo guardar el personal.', 'error');
            }
        });
    }

    deletePersonal(per: SubcontratistaPersonal): void {
        Swal.fire({
            title: '¿Eliminar personal?',
            text: `¿Estás seguro de eliminar a "${per.nombre}" de la lista?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            reverseButtons: true,
            buttonsStyling: false,
            customClass: {
                popup: 'rounded-3xl p-6 shadow-2xl border-0',
                confirmButton: 'inline-flex items-center justify-center px-6 py-3 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-all duration-300 mx-2 shadow-lg shadow-red-200',
                cancelButton: 'inline-flex items-center justify-center px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-500 text-sm font-bold rounded-xl transition-all duration-300 mx-2'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                this._subService.eliminarPersonal(per.idPersonal).subscribe({
                    next: () => {
                        Swal.fire({
                            title: '¡Eliminado!',
                            text: 'El personal ha sido eliminado.',
                            icon: 'success',
                            timer: 1500,
                            showConfirmButton: false
                        });
                        this.loadPersonal();
                    },
                    error: (err) => {
                        console.error(err);
                        Swal.fire('Error', 'No se pudo eliminar al personal.', 'error');
                    }
                });
            }
        });
    }
}
