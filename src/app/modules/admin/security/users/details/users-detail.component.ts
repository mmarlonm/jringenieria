import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { TextFieldModule } from '@angular/cdk/text-field';
import { DatePipe, NgClass,CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    ElementRef,
    OnDestroy,
    OnInit,
    Renderer2,
    TemplateRef,
    ViewChild,
    ViewContainerRef,
    ViewEncapsulation,
} from '@angular/core';
import {
    FormsModule,
    ReactiveFormsModule,
    UntypedFormArray,
    UntypedFormBuilder,
    UntypedFormGroup,
    Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatOptionModule, MatRippleModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDrawerToggleResult } from '@angular/material/sidenav';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FuseFindByKeyPipe } from '@fuse/pipes/find-by-key/find-by-key.pipe';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { UsersService } from 'app/modules/admin/security/users/users.service';
import { UsersListComponent } from 'app/modules/admin/security/users/list/users-list.component';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
//servicion para obtener roles
import { RolService } from 'app/modules/admin/security/roles/roles.service';

@Component({
    selector: 'users-details',
    templateUrl: './users-detail.component.html',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [
        MatButtonModule,
        MatTooltipModule,
        RouterLink,
        MatIconModule,
        FormsModule,
        ReactiveFormsModule,
        MatRippleModule,
        MatFormFieldModule,
        MatInputModule,
        MatCheckboxModule,
        NgClass,
        MatSelectModule,
        MatOptionModule,
        MatDatepickerModule,
        TextFieldModule,
        FuseFindByKeyPipe,
        DatePipe,
        CommonModule,
        MatSlideToggleModule
    ],
})
export class UsersDetailsComponent implements OnInit, OnDestroy {
    @ViewChild('avatarFileInput') private _avatarFileInput: ElementRef;

    editMode: boolean = false;
    tagsEditMode: boolean = false;
    user: any;
    contactForm: UntypedFormGroup;
    users: any[];
    private _tagsPanelOverlayRef: OverlayRef;
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    //asignar roles existentes en sistema
    roles:any[]=[];

    /**
     * Constructor
     */
    constructor(
        private _activatedRoute: ActivatedRoute,
        private _changeDetectorRef: ChangeDetectorRef,
        private _usersListComponent: UsersListComponent,
        private _usersService: UsersService,
        private _formBuilder: UntypedFormBuilder,
        private _fuseConfirmationService: FuseConfirmationService,
        private _renderer2: Renderer2,
        private _router: Router,
        private _overlay: Overlay,
        private _viewContainerRef: ViewContainerRef,
        private _rolService: RolService,
        private router: Router,
    ) {}

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {

        //get roles
        this._rolService.getRoles().subscribe((resolve)=>{
            this.roles = resolve;
        });
        // Open the drawer
        this._usersListComponent.matDrawer.open();

        // Create the user form
        this.contactForm = this._formBuilder.group({
            usuarioId: [''],
            avatar: [null],
            nombreUsuario: ['', [Validators.required]],
            email: ['', [Validators.required, Validators.email]],
            telefono: ['', [Validators.required]],
            activo: [true, [Validators.required]],
            rolId: ['', [Validators.required]]  // Campo para seleccionar el rol
        });

        // Get the users
        this._usersService.users$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((users: any[]) => {
                this.users = users;

                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

        // Get the user
        this._usersService.user$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((user: any) => {
                // Open the drawer in case it is closed
                this._usersListComponent.matDrawer.open();

                // Get the user
                this.user = user;

                // Patch values to the form
                this.contactForm.patchValue(user);

                // Toggle the edit mode off
                this.toggleEditMode(false);

                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

        
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();

        // Dispose the overlays if they are still on the DOM
        if (this._tagsPanelOverlayRef) {
            this._tagsPanelOverlayRef.dispose();
        }
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Close the drawer
     */
    closeDrawer(): Promise<MatDrawerToggleResult> {
        return this._usersListComponent.matDrawer.close();
    }

    /**
     * Toggle edit mode
     *
     * @param editMode
     */
    toggleEditMode(editMode: boolean | null = null): void {
        if (editMode === null) {
            this.editMode = !this.editMode;
        } else {
            this.editMode = editMode;
        }

        // Mark for check
        this._changeDetectorRef.markForCheck();
    }

    /**
     * Update the user
     */
    updateContact(): void {
        // Obtener los valores del formulario
        const user = this.contactForm.getRawValue();
    
        // Verificar si el avatar tiene un prefijo y eliminarlo
        if (user.avatar && user.avatar.startsWith("data:image")) {
            user.avatar = user.avatar.split(",")[1]; // Extrae solo la parte Base64
        }
    
        // Enviar la data al servicio
        this._usersService.updateUsers(user).subscribe(res => {
        });
    }

    /**
     * Delete the user
     */
    deleteContact(): void {
        // Open the confirmation dialog
        const confirmation = this._fuseConfirmationService.open({
            title: 'Delete user',
            message:
                'Are you sure you want to delete this user? This action cannot be undone!',
            actions: {
                confirm: {
                    label: 'Delete',
                },
            },
        });

        // Subscribe to the confirmation dialog closed action
        confirmation.afterClosed().subscribe((result) => {
            // If the confirm button pressed...
            if (result === 'confirmed') {
                // Get the current user's usuarioId
                const usuarioId = this.user.usuarioId;

                // Get the next/previous user's usuarioId
                const currentContactIndex = this.users.findIndex(
                    (item) => item.usuarioId === usuarioId
                );
                const nextContactIndex =
                    currentContactIndex +
                    (currentContactIndex === this.users.length - 1 ? -1 : 1);
                const nextContactId =
                    this.users.length === 1 && this.users[0].usuarioId === usuarioId
                        ? null
                        : this.users[nextContactIndex].usuarioId;

                // Delete the user
                this._usersService
                    .deleteContact(usuarioId)
                    .subscribe((isDeleted) => {
                        // Return if the user wasn't deleted...
                        if (!isDeleted) {
                            return;
                        }

                        // Navigate to the next user if available
                        if (nextContactId) {
                            this._router.navigate(['../', nextContactId], {
                                relativeTo: this._activatedRoute,
                            });
                        }
                        // Otherwise, navigate to the parent
                        else {
                            this._router.navigate(['../'], {
                                relativeTo: this._activatedRoute,
                            });
                        }

                        // Toggle the edit mode off
                        this.toggleEditMode(false);
                    });

                // Mark for check
                this._changeDetectorRef.markForCheck();
            }
        });
    }

    /**
     * Upload avatar
     *
     * @param fileList
     */
    uploadAvatar(fileList: FileList): void {
        // Si no hay archivos, salir
        if (!fileList.length) {
            return;
        }
    
        const allowedTypes = ['image/jpeg', 'image/png'];
        const file = fileList[0];
    
        // Si el tipo de archivo no es permitido, salir
        if (!allowedTypes.includes(file.type)) {
            console.error("Tipo de archivo no permitido.");
            return;
        }
    
        // Convertir a Base64
        const reader = new FileReader();
        reader.onload = () => {
            const base64String = reader.result as string;
    
            // Asignar al formulario
            this.contactForm.patchValue({ avatar: base64String });
            this.user.avatar =base64String;
    
        };
    
        reader.readAsDataURL(file); // Leer el archivo como Data URL (Base64)
    }

    /**
     * Remove the avatar
     */
    removeAvatar(): void {
        // Get the form control for 'avatar'
        const avatarFormControl = this.contactForm.get('avatar');

        // Set the avatar as null
        avatarFormControl.setValue(null);

        // Set the file input value as null
        this._avatarFileInput.nativeElement.value = null;

        // Update the user
        this.user.avatar = null;
    }

    /**
     * Add the email field
     */
    addEmailField(): void {
        // Create an empty email form group
        const emailFormGroup = this._formBuilder.group({
            email: [''],
            label: [''],
        });

        // Add the email form group to the emails form array
        (this.contactForm.get('emails') as UntypedFormArray).push(
            emailFormGroup
        );

        // Mark for check
        this._changeDetectorRef.markForCheck();
    }

    /**
     * Remove the email field
     *
     * @param index
     */
    removeEmailField(index: number): void {
        // Get form array for emails
        const emailsFormArray = this.contactForm.get(
            'emails'
        ) as UntypedFormArray;

        // Remove the email field
        emailsFormArray.removeAt(index);

        // Mark for check
        this._changeDetectorRef.markForCheck();
    }

    /**
     * Add an empty phone number field
     */
    addPhoneNumberField(): void {
        // Create an empty phone number form group
        const phoneNumberFormGroup = this._formBuilder.group({
            country: ['us'],
            phoneNumber: [''],
            label: [''],
        });

        // Add the phone number form group to the phoneNumbers form array
        (this.contactForm.get('phoneNumbers') as UntypedFormArray).push(
            phoneNumberFormGroup
        );

        // Mark for check
        this._changeDetectorRef.markForCheck();
    }

    /**
     * Remove the phone number field
     *
     * @param index
     */
    removePhoneNumberField(index: number): void {
        // Get form array for phone numbers
        const phoneNumbersFormArray = this.contactForm.get(
            'phoneNumbers'
        ) as UntypedFormArray;

        // Remove the phone number field
        phoneNumbersFormArray.removeAt(index);

        // Mark for check
        this._changeDetectorRef.markForCheck();
    }

    /**
     * Track by function for ngFor loops
     *
     * @param index
     * @param item
     */
    trackByFn(index: number, item: any): any {
        return item.usuarioId || index;
    }

    navigateToProject(id){
        this.router.navigate([`/dashboards/project/${id}`]);
    }
}
