# Cycle tracking schema

Cycle history is stored below the authenticated user's Firestore document:

```text
users/{uid}
  cycleLength: number
  cycles/{cycleId}
    startDate: "YYYY-MM-DD"
    endDate: "YYYY-MM-DD"
    flowIntensity: string | null
    symptoms: string[]
    mood: string | null
    loggedAt: server timestamp
```

The API derives predictions at read time so estimates automatically adapt when
history changes. `firestore.rules` restricts profiles and nested health records
to the matching authenticated Firebase user.
