# Scraping API Documentation

## Overview
The Scraping API provides comprehensive endpoints for managing FA Full-Time web scraping operations. All endpoints require authentication and appropriate role permissions (ADMIN or MANAGER).

## Base URL
```
http://localhost:3000/scraping
```

## Authentication
All endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Endpoints

### 1. Service Status & Health

#### GET /scraping/status
Get the current status of the scraping service.

**Response:**
```json
{
  "status": "Scraping service is running",
  "safeMode": true,
  "configuration": {
    "isRunning": false,
    "safeMode": true,
    "totalDivisions": 0,
    "totalSeasons": 0,
    "errors": []
  }
}
```

#### GET /scraping/health
Get detailed health status of the scraping service.

**Response:**
```json
{
  "success": true,
  "healthy": true,
  "status": {
    "isRunning": false,
    "safeMode": true,
    "totalDivisions": 0,
    "totalSeasons": 0,
    "errors": []
  },
  "timestamp": "2025-08-17T19:23:11.025Z"
}
```

### 2. Discovery Endpoints

#### GET /scraping/divisions
Discover all available divisions from FA Full-Time.

**Response:**
```json
[
  {
    "id": "107103457",
    "name": "Supreme Trophies Graham Dodd Premier Div",
    "leagueId": "3545957",
    "isActive": true,
    "lastScraped": "2025-08-17T19:14:00.055Z"
  }
]
```

#### GET /scraping/seasons
Discover all available seasons from FA Full-Time.

**Response:**
```json
[
  {
    "id": "965423047",
    "name": "2025-26",
    "isLive": true,
    "isCurrent": true,
    "leagueId": "3545957",
    "year": 2025,
    "startDate": "2025-07-31T23:00:00.000Z",
    "endDate": "2026-05-30T23:00:00.000Z"
  }
]
```

#### GET /scraping/discover
Comprehensive discovery of divisions and seasons.

**Response:**
```json
{
  "divisions": [...],
  "seasons": [...],
  "currentSeason": {...},
  "lastUpdated": "2025-08-17T19:14:17.880Z",
  "success": true
}
```

### 3. Scraping Operations

#### POST /scraping/scrape-table
Scrape league table for a specific division and season.

**Request Body:**
```json
{
  "divisionId": "107103457",
  "seasonId": "965423047",
  "leagueId": "3545957",
  "forceRefresh": false
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "position": 1,
      "teamName": "Carpet FC",
      "played": 0,
      "won": 0,
      "drawn": 0,
      "lost": 0,
      "goalsFor": 0,
      "goalsAgainst": 0,
      "goalDifference": 0,
      "points": 0
    }
  ],
  "stats": {
    "totalTeams": 9,
    "parseErrors": 0,
    "skippedRows": 0,
    "processingTime": 2680
  }
}
```

#### POST /scraping/scrape-division
Scrape a specific division (uses current season if not specified).

**Request Body:**
```json
{
  "divisionId": "107103457",
  "seasonId": "965423047",
  "leagueId": "3545957",
  "includeHistorical": false
}
```

#### POST /scraping/scrape-multiple
Scrape multiple divisions with optional parallel processing.

**Request Body:**
```json
{
  "divisionIds": ["107103457", "248529810"],
  "seasonId": "965423047",
  "leagueId": "3545957",
  "parallel": false
}
```

**Response:**
```json
{
  "success": true,
  "results": [...],
  "summary": {
    "totalDivisions": 2,
    "successCount": 2,
    "failureCount": 0,
    "totalTime": 4892,
    "parallel": false
  },
  "timestamp": "2025-08-17T19:23:45.692Z"
}
```

### 4. Configuration Management

#### GET /scraping/config
Get current scraping configuration.

**Response:**
```json
{
  "success": true,
  "config": {
    "isRunning": false,
    "safeMode": true,
    "totalDivisions": 0,
    "totalSeasons": 0,
    "errors": []
  },
  "timestamp": "2025-08-17T19:23:15.337Z"
}
```

#### PUT /scraping/config
Update scraping configuration (ADMIN only).

**Request Body:**
```json
{
  "safeMode": false,
  "rateLimitDelay": 3000,
  "userAgent": "Custom User Agent"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Configuration updated successfully",
  "currentConfig": {...},
  "timestamp": "2025-08-17T19:23:45.692Z"
}
```

### 5. Testing & Maintenance

#### POST /scraping/test
Run a comprehensive test of the scraping system.

**Response:**
```json
{
  "success": true,
  "data": {
    "discovery": {...},
    "sampleLeagueTable": [...],
    "safeMode": true
  },
  "timestamp": "2025-08-17T19:14:28.733Z",
  "divisionId": "248529810",
  "seasonId": "965423047",
  "teamsFound": 9,
  "processingTime": 5102
}
```

#### POST /scraping/refresh-cache
Refresh cached discovery data.

**Response:**
```json
{
  "success": true,
  "message": "Cache refreshed successfully",
  "discovery": {...},
  "timestamp": "2025-08-17T19:23:45.692Z"
}
```

#### GET /scraping/logs
Get scraping logs (placeholder for future implementation).

**Query Parameters:**
- `limit`: Number of logs to return
- `level`: Log level filter (debug, info, warn, error)
- `divisionId`: Filter by division
- `seasonId`: Filter by season

**Response:**
```json
{
  "success": true,
  "logs": [],
  "message": "Logging system not yet implemented",
  "timestamp": "2025-08-17T19:23:45.692Z"
}
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "timestamp": "2025-08-17T19:23:51.536Z"
}
```

Common error scenarios:
- **400 Bad Request**: Missing required fields or invalid data
- **401 Unauthorized**: Invalid or missing authentication token
- **403 Forbidden**: Insufficient role permissions
- **404 Not Found**: Division or season not found
- **500 Internal Server Error**: Scraping or processing errors

## Rate Limiting

The scraping service implements rate limiting:
- 2-3 second delays between requests
- Configurable via configuration endpoint
- Prevents server overload and respects FA website

## Safe Mode

Safe mode prevents database writes during testing:
- Enabled by default
- Can be disabled via configuration endpoint
- All scraping operations work in read-only mode
- Perfect for testing and validation

## Performance

Typical processing times:
- **Discovery**: 2-3 seconds
- **Single division scraping**: 3-4 seconds
- **Multiple divisions (sequential)**: 5-10 seconds
- **Multiple divisions (parallel)**: 3-5 seconds

## Security

- **Authentication required** for all endpoints
- **Role-based access control** (ADMIN/MANAGER)
- **Safe mode protection** against accidental writes
- **Input validation** on all request bodies
- **Error handling** prevents information leakage
