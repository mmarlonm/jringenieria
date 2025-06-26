import { TextFieldModule } from '@angular/cdk/text-field';
import { NgClass, CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    OnDestroy,
    OnInit,
    ViewEncapsulation,
} from '@angular/core';
import {
    FormBuilder,
    FormGroup,
    FormsModule,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCard, MatCardTitle } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink, Router } from '@angular/router';
import { FuseCardComponent } from '@fuse/components/card';
import { UserService } from 'app/core/user/user.service';
import { User } from 'app/core/user/user.types';
import { Subject, finalize, takeUntil, takeWhile, tap, timer } from 'rxjs';
import { AuthService } from 'app/core/auth/auth.service';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { ProfileService } from './profile.services';

@Component({
    selector: 'profile',
    templateUrl: './profile.component.html',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [
        RouterLink,
        FuseCardComponent,
        MatIconModule,
        MatButtonModule,
        MatMenuModule,
        MatFormFieldModule,
        MatInputModule,
        TextFieldModule,
        MatDividerModule,
        MatTooltipModule,
        NgClass,
        FormsModule,
        ReactiveFormsModule,
        MatCard,
        MatCardTitle,
        CommonModule,
        MatSelectModule,
        MatDatepickerModule
    ],
})
export class ProfileComponent implements OnInit {
    userAvatar: string | ArrayBuffer | null = null; // Ruta temporal para mostrar la imagen seleccionada
    user: User;
    userForm: FormGroup;
    userinformationForm: FormGroup;

    baseAavatar: any;
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    // Variables para controlar la visibilidad de las contraseñas
    hideCurrentPassword: boolean = true;
    hideNewPassword: boolean = true;
    hideConfirmPassword: boolean = true;
    countdown: number = 5;
    constructor(
        private _userService: UserService,
        private cdRef: ChangeDetectorRef,
        private _formBuilder: FormBuilder,
        private _snackBar: MatSnackBar,
        private _authService: AuthService,
        private _router: Router,
        private _profileService : ProfileService
    ) {
        
    }

    /**
     * On init
     */
    ngOnInit(): void {
        // Create the form
        this._userService.user$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((user: User) => {
                this.user = user['usuario'];
                this.baseAavatar = this.user.avatar;
                
              
                this.userForm = this._formBuilder.group(
                    {
                      nombreUsuario: [this.user.nombreUsuario, Validators.required],
                      email: [user['usuario'].email, [Validators.required, Validators.email, Validators.maxLength(255)]],
                      currentPasswordUser: [''],
                      newPasswordUser: ['', [Validators.minLength(6)]],
                      confirmPasswordUser: [''],
                    },
                 { validators: this.passwordsMatch }
                  );
                this.userinformationForm = this._formBuilder.group(
                  {
                    UsuarioInformacionId:[0],
                    sexo:[null],
                    fechaNacimiento:[null],
                    NumeroContacto1:[null],
                    nombreContacto1:[null],
                    parentesco1:[null],
                    NumeroContacto2:[null],
                    nombreContacto2:[null],
                    parentesco2:[null],
                    direccion:[null],
                  }
                  );


                  // Forzar validación al cambiar los valores de las contraseñas
            this.userForm.get('newPasswordUser')?.valueChanges.subscribe(() => {
                this.userForm.updateValueAndValidity();
            });

            this.userForm.get('confirmPasswordUser')?.valueChanges.subscribe(() => {
                this.userForm.updateValueAndValidity();
            });
              this._profileService.getProfile(Number(this.user.id)).subscribe((res:any) => { 
                console.log("resultado ",res)
                this.userinformationForm.patchValue(
                  {
                    UsuarioInformacionId : res.usuarioInformacion.usuarioInformacionId,
                    sexo: res.usuarioInformacion.sexo,
                    fechaNacimiento:res.usuarioInformacion.fechaNacimiento,
                    NumeroContacto1:res.usuarioInformacion.numeroContacto1,
                    nombreContacto1:res.usuarioInformacion.nombreContacto1,
                    parentesco1:res.usuarioInformacion.parentesco1,
                    NumeroContacto2:res.usuarioInformacion.numeroContacto2,
                    nombreContacto2:res.usuarioInformacion.nombreContacto2,
                    parentesco2:res.usuarioInformacion.parentesco2,
                    direccion:res.usuarioInformacion.direccion,
                  }
                )
                })
            });
    }

    passwordsMatch(group: FormGroup): { passwordMismatch: boolean } | null {
        const newPasswordUser = group.get('newPasswordUser')?.value;
        const confirmPasswordUser  = group.get('confirmPasswordUser')?.value;
        return newPasswordUser  === confirmPasswordUser  ? null : { passwordMismatch: true };
      }

      

    /**
     * Manejar el evento de selección de archivo
     * @param event Evento del input file
     */
    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            const file = input.files[0];

            // Crear una vista previa del archivo
            const reader = new FileReader();
            reader.onload = () => {
                this.userAvatar = reader.result;
            };
            reader.readAsDataURL(file);

            // Llamar al método para enviar el archivo al servidor
            this.uploadAvatar(file);
        }
    }

    /**
     * Subir la foto de perfil al servidor
     * @param file Archivo seleccionado
     */
    uploadAvatar(file: File): void {
        const formData = new FormData();
        formData.append('foto', file);

        this._userService
            .updateAvatar(this.user.id, formData)
            .subscribe((res) => {
                this._userService.user = {
                    ...this.user, // Mantener otros valores existentes
                    avatar: res.avatarBase64, // Actualizar solo el avatar
                };
                this.baseAavatar = res.avatarBase64;

                // Forzamos la detección de cambios en el componente para actualizar la UI
                this.cdRef.markForCheck();
            });
    }

    /**
   * Manejar el envío del formulario.
   */
  onSubmit(): void {
    if (this.userForm.invalid) {
      return;
    }
    

    const { nombreUsuario, email, currentPasswordUser, newPasswordUser, confirmPasswordUser } = this.userForm.value;
    const { UsuarioInformacionId, sexo, fechaNacimiento, NumeroContacto1, NumeroContacto2, nombreContacto1, nombreContacto2, parentesco1, parentesco2, direccion} = this.userinformationForm.value;
    const id = this.user.id;
    const obj = { nombreUsuario, email , id, UsuarioInformacion : { UsuarioInformacionId, sexo, fechaNacimiento, NumeroContacto1, NumeroContacto2, nombreContacto1, nombreContacto2, parentesco1, parentesco2, direccion} };
    // Actualizar datos del usuario
    this._userService.updateUser(obj).subscribe(
      () => {
        this._snackBar.open('Datos de usuario actualizados correctamente', 'Cerrar', {
          duration: 3000,
        });
      },
      (error) => {
        this._snackBar.open('Error al actualizar datos de usuario', 'Cerrar', {
          duration: 3000,
        });
      }
    );

    // Cambiar contraseña si se completó
    if (currentPasswordUser && newPasswordUser && confirmPasswordUser) {
      this._userService.changePassword(Number.parseInt(id), currentPasswordUser, newPasswordUser, confirmPasswordUser).subscribe(
        (res) => {
          this._snackBar.open('Contraseña actualizada correctamente', 'Cerrar', {
            duration: 3000,
          });

          setTimeout(() => {
            // Sign out
                    this._authService.signOut();
            
                    // Redirect after the countdown
                    timer(1000, 1000)
                        .pipe(
                            finalize(() => {
                                this._router.navigate(['sign-in']);
                            }),
                            takeWhile(() => this.countdown > 0),
                            takeUntil(this._unsubscribeAll),
                            tap(() => this.countdown--)
                        )
                        .subscribe();
          }, 3000);
        },
        (error) => {
          this._snackBar.open(error.error.mensaje, 'Cerrar', {
            duration: 3000,
          });
        }
      );
    }
  }
}
