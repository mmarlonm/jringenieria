// Este componente lista tareas y permite agregar una nueva desde un modal
import { Component, OnInit, ViewChild, AfterViewInit } from "@angular/core";
import { MatTableDataSource } from "@angular/material/table";
import { MatPaginator } from "@angular/material/paginator";
import { MatSort } from "@angular/material/sort";
import { MatDialog } from "@angular/material/dialog";
import { MatSnackBar } from "@angular/material/snack-bar";
import { TaskService } from "../tasks.service";
import { Task } from "./../models/tasks.model";
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { TaskFormDialogComponent } from "./../task-form-dialog/task-form-dialog.component";
import { CommonModule } from "@angular/common";
import { MatIconModule } from "@angular/material/icon";
import { MatMenuModule } from "@angular/material/menu";
import { MatSelectModule } from "@angular/material/select";
import Swal from "sweetalert2";
import { User } from "app/core/user/user.types";
import { UserService } from "app/core/user/user.service";
import { Subject, takeUntil } from "rxjs";

@Component({
    selector: "app-task-list",
    templateUrl: "./tasks-list.component.html",
    styleUrls: ["./tasks-list.component.scss"],
    standalone: true,
    imports: [
        CommonModule,
        MatTableModule,
        MatButtonModule,
        MatIconModule,
        MatPaginator,
        MatSort,
        MatFormFieldModule,
        MatInputModule,
        FormsModule,
        MatMenuModule,
        MatSelectModule,
        MatPaginatorModule,
        MatSortModule,
        MatDialogModule,
        MatSnackBarModule,
        MatDatepickerModule,
        MatNativeDateModule,
        ReactiveFormsModule
    ],
})
export class TaskListComponent implements OnInit, AfterViewInit {
    displayedColumns: string[] = ["id", "nombre", "fechaInicioEstimada", "fechaFinEstimada", "estatus", "comentarios", "actions"];
    dataSource = new MatTableDataSource<Task>();
    @ViewChild(MatPaginator) paginator: MatPaginator;
    @ViewChild(MatSort) sort: MatSort;
    //informacion de usuario logeado
    private _unsubscribeAll: Subject<any> = new Subject<any>();
    user: User;

    filterValue: string = '';
    currentFilterColumn: string = '';

    constructor(
        private taskService: TaskService,
        private snackBar: MatSnackBar,
        private dialog: MatDialog,
        private _userService: UserService
    ) { }

    ngOnInit(): void {
        // Subscribe to the user service
        this._userService.user$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((user: User) => {
                this.user = user["usuario"];
            });
        this.loadTasks();
    }

    ngAfterViewInit(): void {
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
    }

    loadTasks(): void {
        this.taskService.getTasks(Number(this.user.id)).subscribe({
            next: (tasks) => {
                this.dataSource.data = tasks;
            },
            error: () => {
                this.snackBar.open("Error al cargar tareas", "Cerrar", { duration: 3000 });
            }
        });
    }

    openTaskDialog(taskId?: number, readOnly: boolean = false): void {
        const dialogRef = this.dialog.open(TaskFormDialogComponent, {
            width: '500px',
            data: taskId ? { id: taskId, readOnly } : null
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result === 'refresh') {
                this.loadTasks();
                this.snackBar.open(
                    taskId ? 'Tarea actualizada correctamente' : 'Tarea agregada exitosamente',
                    'Cerrar',
                    { duration: 3000 }
                );
            }
        });
    }



    // Puedes agregar más funciones como editar/eliminar tareas aquí

    /**
     * Aplica el filtro correspondiente basado en el tipo de columna.
     */
    applyFilter(): void {
        this.setCustomFilter(); // Asegúrate de configurar el filtro antes
        this.dataSource.filter = this.filterValue.trim().toLowerCase(); // Se usa como input del predicate
    }

    /**
     * Establece un filtro personalizado para la tabla
     */
    setCustomFilter(): void {
        this.dataSource.filterPredicate = (data: any, filter: string) => {
            if (this.currentFilterColumn) {
                // Filtro por columna específica
                if (this.isTextFilter(this.currentFilterColumn)) {
                    return data[this.currentFilterColumn]?.toLowerCase().includes(filter);
                } else {
                    return data[this.currentFilterColumn] === this.filterValue;
                }
            } else {
                // Filtro global en todos los campos visibles
                return this.displayedColumns.some((col) => {
                    return data[col]?.toString().toLowerCase().includes(filter);
                });
            }
        };
    }

    /**
     * Determina si el filtro es de tipo texto.
     */
    isTextFilter(column: string): boolean {
        return column === 'empresa';
    }

    deleteTask(id: number): void {
        Swal.fire({
            title: '¿Estás seguro?',
            text: 'Esta acción no se puede deshacer',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                this.taskService.deleteTask(id).subscribe(() => {
                    this.loadTasks();
                    this.snackBar.open('Tarea eliminada correctamente', 'Cerrar', { duration: 3000 });
                });
            }
        });
    }

    getClassByStatus(status: number): string {
        switch (status) {
            case 1: return 'verde';      // Terminada
            case 2: return 'amarillo';   // En proceso
            case 3: return 'naranja';    // En pausa
            case 4: return 'rojo';       // Detenida
            default: return 'gris';
        }
    }

    getStatusName(status: number): string {
        switch (status) {
            case 1: return 'Terminada';
            case 2: return 'En proceso';
            case 3: return 'En pausa';
            case 4: return 'Detenida';
            default: return 'Sin estatus';
        }
    }
}
