# JZ Vacation Stays — Database Schema

All tables use Drizzle ORM `pgTable`. UUIDs for primary keys. Timestamps for audit trails. Amounts in cents (integer).

## Tables

### users
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, defaultRandom |
| email | varchar(255) | unique, not null |
| name | varchar(255) | |
| role | varchar(20) | "guest" \| "admin", default "guest" |
| created_at | timestamp | defaultNow |
| updated_at | timestamp | defaultNow |

### sessions
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK → users, cascade delete |
| token | varchar(255) | unique, not null |
| expires_at | timestamp | not null |
| created_at | timestamp | defaultNow |

### otp_codes
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| email | varchar(255) | not null |
| code | varchar(6) | not null |
| expires_at | timestamp | not null |
| used | boolean | default false |
| created_at | timestamp | defaultNow |

### properties
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| slug | varchar(100) | unique ("seaglass-villa", "coral-retreat") |
| name | varchar(255) | not null |
| tagline | varchar(255) | "Oceanfront", "Private Pool" |
| description | text | |
| max_guests | integer | not null |
| bedrooms | integer | not null |
| bathrooms | numeric(3,1) | not null |
| cleaning_fee | integer | cents, default 0 |
| address | text | |
| latitude | numeric(10,7) | |
| longitude | numeric(10,7) | |
| amenities | jsonb | string[], default [] |
| highlight | varchar(255) | "Family favorite", "Kid-friendly pool" |
| is_active | boolean | default true |
| created_at | timestamp | defaultNow |
| updated_at | timestamp | defaultNow |

### property_photos
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| property_id | uuid | FK → properties, cascade delete |
| url | varchar(500) | not null |
| alt | varchar(255) | |
| sort_order | integer | default 0 |
| is_cover | boolean | default false |
| created_at | timestamp | defaultNow |

### bookings
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| property_id | uuid | FK → properties |
| user_id | uuid | FK → users, nullable (guest checkout) |
| guest_name | varchar(255) | not null |
| guest_email | varchar(255) | not null |
| guest_phone | varchar(50) | |
| guests_count | integer | not null |
| check_in | date | not null |
| check_out | date | not null |
| total_amount | integer | cents, not null |
| status | varchar(30) | "pending" \| "confirmed" \| "cancelled" \| "completed" |
| stripe_payment_intent_id | varchar(255) | |
| source | varchar(30) | "direct" \| "airbnb" \| "vrbo" \| "hospitable" |
| notes | text | |
| created_at | timestamp | defaultNow |
| updated_at | timestamp | defaultNow |

### reviews
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| property_id | uuid | FK → properties |
| booking_id | uuid | FK → bookings, nullable |
| guest_name | varchar(255) | not null |
| rating | integer | 1-5 |
| comment | text | |
| source | varchar(30) | "direct" \| "airbnb" \| "vrbo" |
| stay_date | date | |
| is_visible | boolean | default true |
| created_at | timestamp | defaultNow |

### calendar_sync
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| property_id | uuid | FK → properties |
| platform | varchar(30) | "airbnb" \| "vrbo" \| "hospitable" |
| ical_import_url | varchar(500) | URL to fetch their calendar |
| ical_export_token | varchar(255) | Token for our export endpoint |
| last_synced_at | timestamp | |
| sync_interval_minutes | integer | default 30 |
| is_active | boolean | default true |
| created_at | timestamp | defaultNow |
| updated_at | timestamp | defaultNow |

### blocked_dates
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| property_id | uuid | FK → properties |
| date | date | not null |
| reason | varchar(30) | "booked" \| "blocked" \| "maintenance" \| "external" |
| source | varchar(30) | "airbnb" \| "vrbo" \| "manual" |
| booking_id | uuid | FK → bookings, nullable |
| created_at | timestamp | defaultNow |

**Constraint:** unique(property_id, date)

### checklists
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| property_id | uuid | FK → properties, nullable |
| title | varchar(255) | not null |
| type | varchar(30) | "turnover" \| "maintenance" \| "inspection" |
| created_by | uuid | FK → users |
| created_at | timestamp | defaultNow |
| updated_at | timestamp | defaultNow |

### checklist_items
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| checklist_id | uuid | FK → checklists, cascade delete |
| title | varchar(255) | not null |
| description | text | |
| is_completed | boolean | default false |
| completed_at | timestamp | |
| completed_by | uuid | FK → users |
| sort_order | integer | default 0 |
| created_at | timestamp | defaultNow |

## Relationships

```
users 1──∞ sessions
users 1──∞ bookings (optional)
users 1──∞ checklists (created_by)
users 1──∞ checklist_items (completed_by)
properties 1──∞ property_photos
properties 1──∞ bookings
properties 1──∞ reviews
properties 1──∞ calendar_sync
properties 1──∞ blocked_dates
properties 1──∞ checklists
bookings 1──∞ blocked_dates (optional)
bookings 1──1 reviews (optional)
checklists 1──∞ checklist_items
```
