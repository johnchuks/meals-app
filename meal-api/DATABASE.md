# Database Schema

UML / ER diagram for the schema defined in [`database.sql`](./database.sql). Rendered with Mermaid (GitHub renders this natively).

## Entity-Relationship Diagram

```mermaid
erDiagram
    PATIENTS ||--o{ PATIENT_ALLERGIES : "has"
    PATIENTS ||--o{ MEAL_REQUESTS : "ordered for"
    MEAL_REQUESTS ||--|| TRAYS : "fulfilled by (1:1)"
    TRAYS ||--o{ TRAY_STATUS_HISTORY : "audited by"
    RECIPES ||--o{ RECIPE_ALLERGENS : "contains"
    RECIPES ||--o{ RECIPE_DIET_COMPATIBILITY : "compatible with"
    MEAL_REQUESTS }o--o{ RECIPES : "selects (recipe_ids[])"

    PATIENTS {
        UUID id PK
        VARCHAR first_name
        VARCHAR last_name
        DATE date_of_birth
        VARCHAR mrn UK
        diet_type diet
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    PATIENT_ALLERGIES {
        UUID id PK
        UUID patient_id FK
        VARCHAR allergen
        VARCHAR severity
        TIMESTAMPTZ recorded_at
    }

    RECIPES {
        UUID id PK
        VARCHAR name
        TEXT description
        BOOLEAN active
        TIMESTAMPTZ created_at
    }

    RECIPE_ALLERGENS {
        UUID recipe_id PK,FK
        VARCHAR allergen PK
    }

    RECIPE_DIET_COMPATIBILITY {
        UUID recipe_id PK,FK
        diet_type compatible_diet PK
    }

    MEAL_REQUESTS {
        UUID id PK
        UUID patient_id FK
        UUID_ARRAY recipe_ids
        meal_request_status status
        TEXT rejection_reason
        TIMESTAMPTZ finalized_at
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    TRAYS {
        UUID id PK
        UUID meal_request_id FK,UK
        tray_status status
        TIMESTAMPTZ created_at
        TIMESTAMPTZ preparation_started_at
        TIMESTAMPTZ accuracy_validated_at
        TIMESTAMPTZ en_route_at
        TIMESTAMPTZ delivered_at
        TIMESTAMPTZ retrieved_at
    }

    TRAY_STATUS_HISTORY {
        UUID id PK
        UUID tray_id FK
        tray_status from_status
        tray_status to_status
        TIMESTAMPTZ transitioned_at
    }
```

## Bounded Contexts

```mermaid
flowchart LR
    subgraph Patient["Patient Clinical"]
        P[patients]
        PA[patient_allergies]
        P --> PA
    end

    subgraph Recipe["Recipe Catalog (shared)"]
        R[recipes]
        RA[recipe_allergens]
        RD[recipe_diet_compatibility]
        R --> RA
        R --> RD
    end

    subgraph MealReq["Meal Request"]
        MR[meal_requests]
    end

    subgraph Kitchen["Kitchen / Tray"]
        T[trays]
        TH[tray_status_history]
        T --> TH
    end

    P -. "patient_id" .-> MR
    R -. "recipe_ids[]" .-> MR
    MR -. "meal_request_id (1:1)" .-> T
```

Dotted arrows are **cross-context references**. In the application layer (Django models) these are stored as plain `UUIDField` rather than `ForeignKey` — see [ARCHITECTURE.md](./ARCHITECTURE.md#module-boundary-rules). The `database.sql` reference schema uses explicit FKs for documentation clarity.

## Enums

| Type | Values |
| ---- | ------ |
| `diet_type` | `REGULAR`, `LOW_SODIUM`, `DIABETIC`, `LOW_FAT`, `PUREED`, `CLEAR_LIQUID`, `FULL_LIQUID` |
| `meal_request_status` | `DRAFT`, `FINALIZED`, `REJECTED` |
| `tray_status` | `CREATED`, `PREPARATION_STARTED`, `ACCURACY_VALIDATED`, `EN_ROUTE`, `DELIVERED`, `RETRIEVED` |

## Tray Lifecycle

```mermaid
stateDiagram-v2
    [*] --> CREATED
    CREATED --> PREPARATION_STARTED : start-preparation
    PREPARATION_STARTED --> ACCURACY_VALIDATED : validate-accuracy
    ACCURACY_VALIDATED --> EN_ROUTE : dispatch
    EN_ROUTE --> DELIVERED : deliver
    DELIVERED --> RETRIEVED : retrieve
    RETRIEVED --> [*]
```

Linear, no skipping, no reversals. Invalid transitions return `409 Conflict`.

## Meal Request Lifecycle

```mermaid
stateDiagram-v2
    [*] --> DRAFT
    DRAFT --> DRAFT : PATCH recipe_ids
    DRAFT --> FINALIZED : finalize (safety check passes)
    DRAFT --> REJECTED : finalize (allergen/diet violation)
    FINALIZED --> [*]
    REJECTED --> [*]
```

On `FINALIZED`, a `trays` row is created in the same transaction (1:1 via `trays.meal_request_id UNIQUE`).
