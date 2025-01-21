import { inject } from '@angular/core';
import {
    ActivatedRouteSnapshot,
    Router,
    RouterStateSnapshot,
    Routes,
} from '@angular/router';
import { UsersComponent } from 'app/modules/admin/security/users/users.component';
import { UsersService } from 'app/modules/admin/security/users/users.service';
import { UsersDetailsComponent } from 'app/modules/admin/security/users/details/users-detail.component';
import { UsersListComponent } from 'app/modules/admin/security/users/list/users-list.component';
import { catchError, throwError } from 'rxjs';

/**
 * Contact resolver
 *
 * @param route
 * @param state
 */
const contactResolver = (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
) => {
    const usersService = inject(UsersService);
    const router = inject(Router);
    console.log("parametro ", route.paramMap.get('id'))

    return usersService.getUserById(route.paramMap.get('id')).pipe(
        // Error here means the requested contact is not available
        catchError((error) => {
            // Log the error
            console.error(error);

            // Get the parent url
            const parentUrl = state.url.split('/').slice(0, -1).join('/');

            // Navigate to there
            router.navigateByUrl(parentUrl);

            // Throw an error
            return throwError(error);
        })
    );
};

/**
 * Can deactivate contacts details
 *
 * @param component
 * @param currentRoute
 * @param currentState
 * @param nextState
 */
const canDeactivateContactsDetails = (
    component: UsersDetailsComponent,
    currentRoute: ActivatedRouteSnapshot,
    currentState: RouterStateSnapshot,
    nextState: RouterStateSnapshot
) => {
    // Get the next route
    let nextRoute: ActivatedRouteSnapshot = nextState.root;
    while (nextRoute.firstChild) {
        nextRoute = nextRoute.firstChild;
    }

    // If the next state doesn't contain '/contacts'
    // it means we are navigating away from the
    // contacts app
    if (!nextState.url.includes('/users')) {
        // Let it navigate
        return true;
    }

    // If we are navigating to another contact...
    if (nextRoute.paramMap.get('id')) {
        // Just navigate
        return true;
    }

    // Otherwise, close the drawer first, and then navigate
    return component.closeDrawer().then(() => true);
};

export default [
    {
        path: '',
        component: UsersComponent,
        children: [
            {
                path: '',
                component: UsersListComponent,
                resolve: {
                    users: () => inject(UsersService).getUsers()
                },
                children: [
                    {
                        path: ':id',
                        component: UsersDetailsComponent,
                        resolve: {
                            user: contactResolver
                        },
                        canDeactivate: [canDeactivateContactsDetails],
                    },
                ],
            },
        ],
    },
] as Routes;
