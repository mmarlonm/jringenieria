import { Component, Inject, OnInit, AfterViewInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import {
    FormBuilder,
    FormGroup,
    Validators,
    FormArray,
    ReactiveFormsModule
} from '@angular/forms';
import { TaskService } from './../tasks.service';
import { UsersService } from '../../../security/users/users.service';
import { UserService } from "app/core/user/user.service";
import {
    MatDatepickerModule
} from '@angular/material/datepicker';
import {
    MatFormFieldModule
} from '@angular/material/form-field';
import {
    MatInputModule
} from '@angular/material/input';
import {
    MatButtonModule
} from '@angular/material/button';
import {
    MatIconModule
} from '@angular/material/icon';
import {
    MatSelectModule
} from '@angular/material/select';
import {
    CommonModule
} from '@angular/common';
import flatpickr from 'flatpickr';
import { User } from 'app/core/user/user.types';
import { Subject, takeUntil } from 'rxjs';

@Component({
    selector: 'app-task-form-dialog',
    templateUrl: './task-form-dialog.component.html',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDatepickerModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatSelectModule
    ]
})
export class TaskFormDialogComponent implements OnInit, AfterViewInit {
    form: FormGroup;
    userList: any[] = [];
    loading: boolean = false;

    private flatpickrInstances: { [key: string]: flatpickr.Instance } = {};

    //informacion de usuario logeado
    private _unsubscribeAll: Subject<any> = new Subject<any>();
    user: User;

    constructor(
        private dialogRef: MatDialogRef<TaskFormDialogComponent>,
        private fb: FormBuilder,
        private taskService: TaskService,
        private usersService: UsersService,
        private _userService: UserService,
        @Inject(MAT_DIALOG_DATA) public data: { id?: number, readOnly?: boolean } | null
    ) {
        this.form = this.fb.group({
            nombre: ['', Validators.required],
            comentarios: [''],
            fechaInicioEstimada: [null],
            fechaFinEstimada: [null],
            fechaInicioReal: [null],
            fechaFinReal: [null],
            usuarioIds: [[]],
            links: this.fb.array([]),
            CreadorId: [null], // ID del usuario que crea la tarea
            estatus : [2, Validators.required] // Nuevo campo de estatus con valor por defecto 1
        });
    }

    ngOnInit(): void {
        // Subscribe to the user service
        this._userService.user$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((user: User) => {
                this.user = user["usuario"];
                this.form.get("CreadorId").setValue(this.user.id); // Setea el usuario logueado como creador por defecto
            });
        this.getUsers();

        if (this.data?.id) {
            this.loadTask(this.data.id);
        }
        if (this.data?.readOnly) {
            this.form.disable(); // Desactiva todo el formulario
        }

    }

    ngAfterViewInit(): void {
        // Inicializa flatpickr sin valor inicial (se setea luego con loadTask)
        this.initFlatpickr('fechaInicioEstimada', 'fechaInicioEstimada');
        this.initFlatpickr('fechaFinEstimada', 'fechaFinEstimada');
        this.initFlatpickr('fechaInicioReal', 'fechaInicioReal');
        this.initFlatpickr('fechaFinReal', 'fechaFinReal');
    }

    initFlatpickr(elementId: string, controlName: string): void {
        const el = document.getElementById(elementId);
        if (!el) return;

        this.flatpickrInstances[controlName] = flatpickr(el, {
            enableTime: true,
            time_24hr: true,
            dateFormat: 'Y-m-d H:i',
            defaultDate: this.form.get(controlName)?.value ?? null,
            onChange: (selectedDates) => {
                // Actualiza FormControl con la fecha/hora seleccionada
                this.form.get(controlName)?.setValue(selectedDates[0] ?? null);
            }
        });
    }

    loadTask(id: number): void {
        this.taskService.getTaskById(id).subscribe(task => {
            // Setea el valor en el form sin perder referencia a Flatpickr
            this.form.patchValue({
                nombre: task.nombre,
                comentarios: task.comentarios,
                fechaInicioEstimada: task.fechaInicioEstimada ? new Date(task.fechaInicioEstimada) : null,
                fechaFinEstimada: task.fechaFinEstimada ? new Date(task.fechaFinEstimada) : null,
                fechaInicioReal: task.fechaInicioReal ? new Date(task.fechaInicioReal) : null,
                fechaFinReal: task.fechaFinReal ? new Date(task.fechaFinReal) : null,
                usuarioIds: task.usuarioIds ?? [],
                CreadorId: this.user.id, // Asigna el ID del usuario logueado
                estatus: task.estatus
            });

            // Actualiza manualmente flatpickr con las fechas ya parseadas
            ['fechaInicioEstimada', 'fechaFinEstimada', 'fechaInicioReal', 'fechaFinReal'].forEach(key => {
                const date = this.form.get(key)?.value;
                if (this.flatpickrInstances[key]) {
                    this.flatpickrInstances[key].setDate(date, false); // false para no disparar onChange
                }
            });

            if (task.links?.length) {
                task.links.forEach(link => this.links.push(this.fb.control(link)));
            }
        });
    }

    get links(): FormArray {
        return this.form.get('links') as FormArray;
    }

    addLink(): void {
        this.links.push(this.fb.control(''));
    }

    removeLink(index: number): void {
        this.links.removeAt(index);
    }

    save(): void {
        if (this.form.invalid) return;

        this.loading = true;

        const formValue = this.form.value;

        // Función para convertir Date local a ISO string sin aplicar desfase horario
        function toLocalISOString(date: Date | null): string | null {
            if (!date) return null;
            // Obtiene componentes en hora local
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            const hour = date.getHours().toString().padStart(2, '0');
            const minute = date.getMinutes().toString().padStart(2, '0');
            const second = date.getSeconds().toString().padStart(2, '0');
            return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
        }

        // Crear el objeto task con fechas corregidas
        const task = {
            ...formValue,
            fechaInicioEstimada: toLocalISOString(formValue.fechaInicioEstimada),
            fechaFinEstimada: toLocalISOString(formValue.fechaFinEstimada),
            fechaInicioReal: toLocalISOString(formValue.fechaInicioReal),
            fechaFinReal: toLocalISOString(formValue.fechaFinReal),
        };

        if (this.data?.id) {
            this.taskService.updateTask(this.data.id, task).subscribe(() => {
                this.loading = false;
                this.dialogRef.close('refresh');
            });
        } else {
            this.taskService.createTask(task).subscribe(() => {
                this.loading = false;
                this.dialogRef.close('refresh');
            });
        }
    }


    cancel(): void {
        this.dialogRef.close();
    }

    getUsers(): void {
        this.usersService.getUsers().subscribe(users => {
            this.userList = users.filter(u => u.rolId !== 3 && u.activo !== false);
        });
    }
}
