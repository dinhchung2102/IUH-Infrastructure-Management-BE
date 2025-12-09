# MongoDB Schemas

## Account

```typescript
email: string (required, unique)
password: string (required)
role: ObjectId (required, ref: Role)
isActive: boolean (required, default: true)
fullName: string (required)
phoneNumber: string (optional, unique, sparse)
address: string (optional)
avatar: string (optional)
gender: enum Gender (optional)
dateOfBirth: Date (optional)
refreshToken: string (optional)
areasManaged: ObjectId[] (default: [])
buildingsManaged: ObjectId[] (default: [])
zonesManaged: ObjectId[] (default: [])
campusManaged: ObjectId | null (default: null)
createdAt: Date (auto)
updatedAt: Date (auto)
```

## Role

```typescript
roleName: string (required, unique)
isActive: boolean (required, default: true)
permissions: ObjectId[] (required, ref: Permission)
createdAt: Date (auto)
updatedAt: Date (auto)
```

## Permission

```typescript
resource: enum Resource (required)
action: enum Action (required)
createdAt: Date (auto)
updatedAt: Date (auto)
```

## Campus

```typescript
name: string (required, unique)
address: string (required)
phone: string (required)
email: string (required)
status: enum CommonStatus (required)
manager: ObjectId (required, ref: Account)
createdAt: Date (auto)
updatedAt: Date (auto)
```

## Building

```typescript
name: string (required, unique)
floor: number (required)
status: enum CommonStatus (required)
campus: ObjectId (required, ref: Campus)
accounts: ObjectId[] (ref: Account)
createdAt: Date (auto)
updatedAt: Date (auto)
```

## Area

```typescript
name: string (required, unique)
status: enum CommonStatus (required)
description: string (required)
campus: ObjectId (required, ref: Campus)
zoneType: enum ZoneType (required)
accounts: ObjectId[] (ref: Account)
createdAt: Date (auto)
updatedAt: Date (auto)
```

## Zone

```typescript
name: string (required, unique)
description: string (required)
status: enum CommonStatus (required)
building: ObjectId (optional, ref: Building)
area: ObjectId (optional, ref: Area)
zoneType: enum ZoneType (required)
floorLocation: number (optional, min: 1, max: 100)
accounts: ObjectId[] (ref: Account)
createdAt: Date (auto)
updatedAt: Date (auto)
```

## AssetCategory

```typescript
name: string (required, unique)
status: enum CommonStatus (required)
description: string (required)
image: string (optional)
createdAt: Date (auto)
updatedAt: Date (auto)
```

## AssetType

```typescript
name: string (required, unique)
assetCategory: ObjectId (required, ref: AssetCategory)
properties: Map<string, any> (required)
createdAt: Date (auto)
updatedAt: Date (auto)
```

## Asset

```typescript
name: string (required)
code: string (required, unique)
status: enum AssetStatus (required)
description: string (required)
serialNumber: string (optional)
brand: string (optional)
assetType: ObjectId (required, ref: AssetType)
assetCategory: ObjectId (required, ref: AssetCategory)
image: string (optional)
warrantyEndDate: Date (optional)
lastMaintenanceDate: Date (optional)
zone: ObjectId (optional, ref: Zone)
area: ObjectId (optional, ref: Area)
properties: Record<string, any> (optional)
createdAt: Date (auto)
updatedAt: Date (auto)
```

## Report

```typescript
asset: ObjectId (required, ref: Asset)
type: enum ReportType (required)
status: enum ReportStatus (required)
priority: enum ReportPriority (optional, default: MEDIUM)
description: string (required)
images: string[] (required)
createdBy: ObjectId (required, ref: Account)
suggestedProcessingDays: number (optional)
rejectReason: string (optional)
rejectedBy: ObjectId (optional, ref: Account)
rejectedAt: Date (optional)
createdAt: Date (auto)
updatedAt: Date (auto)
```

## AuditLog

```typescript
report: ObjectId (optional, ref: Report)
asset: ObjectId (optional, ref: Asset)
status: enum AuditStatus (required, default: PENDING)
subject: string (required)
description: string (optional)
staffs: ObjectId[] (required, ref: Account)
images: string[] (optional, default: [])
acceptedBy: ObjectId (optional, ref: Account)
acceptedAt: Date (optional)
completedBy: ObjectId (optional, ref: Account)
completedAt: Date (optional)
notes: string (optional)
expiresAt: Date (optional)
createdAt: Date (auto)
updatedAt: Date (auto)
```

## News

```typescript
title: string (required, unique)
description: string (required)
thumbnail: string (required)
slug: string (unique, trim)
author: string (required)
status: enum NewsStatus (default: DRAFT)
content: any (Mixed)
category: ObjectId (ref: NewsCategory)
createdAt: Date (auto)
updatedAt: Date (auto)
```

## NewsCategory

```typescript
name: string (required, unique)
description: string (optional)
image: string (optional)
slug: string (unique, trim, lowercase)
isActive: boolean (default: true)
createdAt: Date (auto)
updatedAt: Date (auto)
```

## KnowledgeBase

```typescript
title: string (required)
content: string (required)
type: enum KnowledgeType (required)
category: string (optional)
tags: string[] (optional)
metadata: Record<string, any> (optional)
isActive: boolean (required, default: true)
createdAt: Date (auto)
updatedAt: Date (auto)
```

## Maintenance

```typescript
asset: ObjectId (required, ref: Asset)
title: string (required)
description: string (required)
status: enum MaintenanceStatus (required, default: PENDING)
priority: enum MaintenancePriority (required, default: MEDIUM)
scheduledDate: Date (required)
completedDate: Date (optional)
createdBy: ObjectId (required, ref: Account)
assignedTo: ObjectId[] (default: [], ref: Account)
notes: string (optional)
images: string[] (optional, default: [])
createdAt: Date (auto)
updatedAt: Date (auto)
```

## IndexedDocument

```typescript
vectorId: string (required)
sourceType: string (required)
sourceId: string (required)
content: string (required)
metadata: {
  title?: string
  url?: string
  category?: string
  tags?: string[]
  location?: string
  lastModified?: Date
} (optional)
embeddingDimension: number (default: 768)
lastSyncedAt: Date (optional)
isActive: boolean (default: true)
createdAt: Date (auto)
updatedAt: Date (auto)
```
