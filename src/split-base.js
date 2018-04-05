/**
 * Copyright 2018 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
'use strict';

export function proxy( target, artifacts, fn ) {
   let promise;

   function validate( source ) {
      Object.keys( artifacts )
         .forEach( bucket => {
            console.log( bucket, artifacts[ bucket ], source );
            const missing = artifacts[ bucket ]
               .filter( ref => !source.aliases[ bucket ].hasOwnProperty( ref ) );

            if( missing.length > 0 ) {
               throw new Error( `Bundle is missing ${bucket} ${missing.map(m => `'${m}'`).join(', ')}` );
            }
         } );
      return source;
   }

   function inject() {
      if( !promise ) {
         promise = fn()
            .then( validate )
            .then( source => merge( target, source ) );
      }
      return promise;
   }

   Object.keys( artifacts )
      .forEach( bucket => {
         artifacts[ bucket ].forEach( ref => {
            let index;
            Object.defineProperty( target.aliases[ bucket ], ref, {
               get() {
                  if( index === undefined ) {
                     index = target[ bucket ].length;
                     target[ bucket ][ index ] = inject()
                        .then( target => target[ bucket ][ index ] );
                  }
                  return index;
               },
               set( value ) {
                  if( value !== index ) {
                     throw new Error( `Attempted to modify aliased index for ${ref}` );
                  }
                  return index;
               }
            } );
         } );
      } );
}

export function merge( target, source ) {
   for( const bucket in source.aliases ) {
      if( source.aliases.hasOwnProperty( bucket ) ) {
         const aliases = source.aliases[ bucket ];
         const list = source[ bucket ];

         for( const ref in aliases ) {
            if( aliases.hasOwnProperty( ref ) ) {
               const index = aliases[ ref ];
               const artifact = list[ index ];
               insert( target, bucket, ref, artifact );
            }
         }
      }
   }
   return target;
}

export function insert( target, bucket, ref, artifact ) {
   const aliases = target.aliases[ bucket ] = ( target.aliases[ bucket ] || {} );
   const list = target[ bucket ] = ( target[ bucket ] || [] );
   const index = aliases[ ref ] = aliases.hasOwnProperty( ref ) ? aliases[ ref ] : list.length;
   list[ index ] = artifact;
   return index;
}

