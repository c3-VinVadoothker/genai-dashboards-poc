# Dashboard Filtering Features

This document describes the comprehensive filtering capabilities added to the dashboard system.

## Overview

The dashboard now supports multiple levels of filtering:

1. **Global Filters** - Apply filters across multiple dashboards
2. **Dashboard-Level Filters** - Apply filters to individual dashboards
3. **Inline Filters** - Compact filters within each dashboard component

## Filter Types

### 1. Date Range Filter
- Filter data by date ranges
- Supports start and end date selection
- Applies to timestamp fields in data

### 2. Numeric Range Filters
- **Wind Speed Range**: Filter by wind speed values (mph)
- **Power Output Range**: Filter by power output values (kW)
- **RPM Range**: Filter by rotor RPM values

### 3. Categorical Filters
- **Location**: Filter by wind farm locations
- **Status**: Filter by turbine status (Active, Warning, Offline)
- **Turbine**: Filter by specific turbine IDs
- **Correlation Type**: Filter by correlation analysis types

### 4. Text Search
- Search across all text fields in the data
- Case-insensitive matching

## Usage Examples

### Global Filtering

1. **Select Multiple Dashboards**
   - Use the dashboard selection checkboxes
   - Click "Select All" to choose all dashboards
   - Click "Clear" to deselect all

2. **Apply Global Filters**
   - Switch to "Global Filters" mode
   - Add filter groups with AND/OR logic
   - Configure date ranges, numeric ranges, or categorical filters
   - Filters apply to all selected dashboards

### Dashboard-Level Filtering

1. **Individual Dashboard Filters**
   - Each dashboard has its own inline filter panel
   - Click the filter icon to expand/collapse
   - Add filter groups specific to that dashboard

2. **Filter Application**
   - Filters are applied in real-time
   - Data is filtered before visualization
   - Filter summary shows active filters

### Example Filter Configurations

#### Date Range Example
```javascript
{
  type: 'date',
  value: {
    start: new Date('2024-01-01'),
    end: new Date('2024-01-31')
  }
}
```

#### Numeric Range Example
```javascript
{
  type: 'numeric',
  value: {
    min: 10,
    max: 50
  }
}
```

#### Categorical Filter Example
```javascript
{
  type: 'location',
  value: ['Wind Farm A', 'Wind Farm B']
}
```

## Filter Logic

### Group Logic
- **AND**: All filters in the group must match
- **OR**: Any filter in the group can match

### Multiple Groups
- Groups are combined with AND logic
- Each group can have different internal logic (AND/OR)

## Data Integration

### Supported Data Sources
- Turbine telemetry data
- Power output data
- Status information
- Location data
- Timestamp data

### Filter Application
- Filters are applied to raw data before processing
- Supports both array and object data structures
- Handles nested data properties
- Case-insensitive matching for text fields

## UI Components

### DashboardFilterPanel
- Main filter interface
- Supports global and dashboard modes
- Quick filter buttons
- Advanced filter groups

### DashboardInlineFilter
- Compact filter interface
- Integrated into individual dashboards
- Collapsible design
- Real-time filter application

### FilterService
- Core filtering logic
- Data transformation
- Filter validation
- Performance optimization

## Technical Implementation

### Filter Service
```typescript
const filterService = FilterService.getInstance()
const filteredResult = filterService.applyFilters(data, filterGroups)
```

### Filter State Management
```typescript
const [dashboardFilters, setDashboardFilters] = useState<FilterGroup[]>([])
const [globalFilterState, setGlobalFilterState] = useState<GlobalFilterState>()
```

### Real-time Updates
- Filters are applied immediately when changed
- Data is re-processed with new filters
- Visualizations update automatically
- Filter summaries show active filters

## Performance Considerations

### Optimization Features
- Lazy loading of filter options
- Debounced filter updates
- Efficient data filtering algorithms
- Minimal re-renders

### Best Practices
- Use specific filter types for better performance
- Limit the number of active filters
- Use appropriate filter logic (AND vs OR)
- Monitor filter performance with large datasets

## Future Enhancements

### Planned Features
- Filter presets and templates
- Advanced filter expressions
- Filter export/import
- Filter analytics and usage tracking
- Custom filter types
- Filter performance metrics

### Integration Opportunities
- API-based filtering
- Real-time data filtering
- Collaborative filtering
- Filter recommendations
- Automated filter suggestions

## Troubleshooting

### Common Issues
1. **Filters not applying**: Check filter group logic and data structure
2. **Performance issues**: Reduce number of active filters
3. **Data not updating**: Verify filter dependencies in useEffect
4. **UI not responding**: Check filter state management

### Debug Tools
- Use the debug terminal to monitor filter application
- Check browser console for filter-related errors
- Verify data structure compatibility
- Test filters with sample data

## Examples

### Basic Date Filter
```javascript
const dateFilter = {
  id: 'date-range',
  name: 'Date Range',
  type: 'date',
  value: {
    start: new Date('2024-01-01'),
    end: new Date('2024-01-31')
  }
}
```

### Complex Filter Group
```javascript
const filterGroup = {
  id: 'group-1',
  name: 'Performance Filters',
  logic: 'AND',
  filters: [
    {
      id: 'wind-speed',
      name: 'Wind Speed',
      type: 'numeric',
      value: { min: 10, max: 30 }
    },
    {
      id: 'status',
      name: 'Status',
      type: 'status',
      value: ['Active', 'Warning']
    }
  ]
}
```

This filtering system provides comprehensive data filtering capabilities while maintaining good performance and user experience. 