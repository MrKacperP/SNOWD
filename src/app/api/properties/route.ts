import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { orderUser, OrderError, orderFailure } from "@/lib/workOrderServer";
import { parsePropertyDetails, parseServiceLocation, profileLocation, sameServiceAddress, type SavedProperty } from "@/lib/serviceLocations";
import type { ClientProfile } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const uid = await orderUser(request), db = getAdminDb();
    const profile = (await db.doc(`users/${uid}`).get()).data();
    if (profile?.role !== "client") throw new OrderError("Properties are available to client accounts.",403);
    const state = (await db.doc(`users/${uid}/private/serviceLocations`).get()).data();
    return NextResponse.json({ properties:state?.properties || [], selectedLocation:state?.selectedLocation || null });
  } catch(error) { return orderFailure(error); }
}
export async function POST(request: NextRequest) {
  try {
    const uid = await orderUser(request), body = await request.json(), db = getAdminDb();
    const propertyId = crypto.randomUUID();
    const result = await db.runTransaction(async tx => {
      const userRef = db.doc(`users/${uid}`), privateRef = db.doc(`users/${uid}/private/serviceLocations`);
      const profile = (await tx.get(userRef)).data() as ClientProfile | undefined;
      const state = (await tx.get(privateRef)).data();
      if (profile?.role !== "client") throw new OrderError("Properties are available to client accounts.",403);
      const properties: SavedProperty[] = state?.properties || [];
      if (body.restoreHome === true) {
        tx.set(privateRef,{properties,selectedLocation:null});
        return {properties,selectedLocation:null};
      }
      const current = state?.selectedLocation || null;
      if (typeof body.removePropertyId === "string") {
        const next = properties.filter(p=>p.id !== body.removePropertyId);
        if (next.length === properties.length) throw new OrderError("That property was already removed.",404);
        tx.set(privateRef,{properties:next,selectedLocation:current});
        return {properties:next,selectedLocation:current};
      }
      // select:false saves or edits a property, or moves the profile home, without changing where service happens.
      const select = body.select !== false;
      if (!select && body.saveFavorite !== true && body.makeHome !== true) throw new OrderError("Name this property to save it.",400);
      let location;
      try { location = parseServiceLocation(body.location); } catch(error) { throw new OrderError((error as Error).message,400); }
      if (select && !sameServiceAddress(location,profileLocation(profile)) && body.confirmDifferent !== true) throw new OrderError("Confirm that service should take place at this address instead of your profile home.",400);
      let next = properties;
      if (body.saveFavorite === true) {
        const label = typeof body.label === "string" ? body.label.trim() : "";
        if (!label || label.length > 60) throw new OrderError("Name this property using up to 60 characters.",400);
        const existing = properties.find(p=>p.id === body.propertyId) || properties.find(p=>sameServiceAddress(p,location));
        if (!existing && properties.length >= 30) throw new OrderError("You can save up to 30 properties.",400);
        let details;
        try { details = body.details === undefined ? undefined : parsePropertyDetails(body.details,uid); } catch(error) { throw new OrderError((error as Error).message,400); }
        // An address edit keeps the photos and details already saved for the property.
        const kept = existing ? {use:existing.use,areaSqft:existing.areaSqft,serviceTypes:existing.serviceTypes,instructions:existing.instructions,photos:existing.photos} : {};
        const saved = JSON.parse(JSON.stringify({...(details || kept),...location,id:existing?.id || propertyId,label})) as SavedProperty;
        next = existing ? properties.map(p=>p.id === existing.id ? saved : p) : [...properties,saved];
      }
      if (body.makeHome === true) {
        const {propertySize: _size,...homeAddress}=location;
        tx.update(userRef,{...homeAddress,"propertyDetails.propertySize":location.propertySize || profile.propertyDetails?.propertySize || "medium",lat:location.lat ?? FieldValue.delete(),lng:location.lng ?? FieldValue.delete(),updatedAt:FieldValue.serverTimestamp()});
      }
      const selectedLocation = !select ? current : body.makeHome === true ? null : location;
      tx.set(privateRef,{properties:next,selectedLocation});
      return {properties:next,selectedLocation};
    });
    return NextResponse.json(result);
  } catch(error) { return orderFailure(error); }
}
