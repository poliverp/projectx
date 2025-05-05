// src/pages/CasePage/components/CaseCalendar.jsx
import React, { useMemo, useRef, useState } from 'react';
import { Card, Calendar, Badge, List, Typography, Space } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { formatDate } from '../../../utils/dateUtils';

dayjs.extend(customParseFormat);

const { Text } = Typography;

// Date field configuration
const DATE_FIELDS = [
  { key: 'filing_date', label: 'Filing Date' },
  { key: 'trial_date', label: 'Trial Date' },
  { key: 'incident_date', label: 'Incident Date' },
  { key: 'created_at', label: 'Case Created' }
];

function CaseCalendar({ caseDetails }) {
  const [selectedDate, setSelectedDate] = useState(null);
  
  // Extract and format all dates from case
  const { events, dateRange, mostRecentDate } = useMemo(() => {
    const events = [];
    let minDate = null;
    let maxDate = null;
    let mostRecentDate = null;

    if (!caseDetails) return { events: [], dateRange: null, mostRecentDate: null };

    // Process each date field
    DATE_FIELDS.forEach(({ key, label }) => {
      let value = caseDetails[key];
      
      // Skip if no value
      if (!value) return;

      // Parse date to dayjs
      let dateObj;
      try {
        // Handle various date formats
        if (key === 'created_at') {
          dateObj = dayjs(value);
        } else {
          dateObj = dayjs(value, ['YYYY-MM-DD', 'MM/DD/YYYY', 'M/D/YYYY']);
        }
        
        if (!dateObj.isValid()) {
          console.warn(`Invalid date for ${key}:`, value);
          return;
        }

        // Add to events array
        events.push({
          key,
          date: dateObj,
          label,
          formattedDate: formatDate(value)
        });

        // Update min/max dates
        if (!minDate || dateObj.isBefore(minDate)) {
          minDate = dateObj;
        }
        if (!maxDate || dateObj.isAfter(maxDate)) {
          maxDate = dateObj;
        }
        
        // Track most recent date (closest to now)
        const now = dayjs();
        if (!mostRecentDate || 
            (dateObj.isBefore(now) && dateObj.isAfter(mostRecentDate)) || 
            (mostRecentDate.isAfter(now) && dateObj.isBefore(mostRecentDate))) {
          mostRecentDate = dateObj;
        }
      } catch (error) {
        console.error(`Error parsing date for ${key}:`, value, error);
      }
    });

    // Sort events by date
    events.sort((a, b) => a.date.valueOf() - b.date.valueOf());

    // Calculate date range (don't need full year padding anymore)
    let range = null;
    if (minDate && maxDate) {
      range = {
        start: minDate.subtract(1, 'month'),
        end: maxDate.add(1, 'month')
      };
    }

    return { events, dateRange: range, mostRecentDate };
  }, [caseDetails]);

  // Create a map for quick date lookup
  const eventsByDate = useMemo(() => {
    const map = new Map();
    events.forEach(event => {
      const dateKey = event.date.format('YYYY-MM-DD');
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey).push(event);
    });
    return map;
  }, [events]);

  // Set initial date when component mounts
  React.useEffect(() => {
    if (mostRecentDate) {
      setSelectedDate(mostRecentDate);
    } else if (events.length > 0) {
      setSelectedDate(events[0].date);
    }
  }, [mostRecentDate, events]);

  // Custom cell renderer for calendar - simplified
  const dateCellRender = (current) => {
    const dateKey = current.format('YYYY-MM-DD');
    const dayEvents = eventsByDate.get(dateKey);
    
    if (!dayEvents) return null;

    // Simplified indicator - just a colored dot with count if multiple
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        marginTop: '2px'
      }}>
        <Badge 
          count={dayEvents.length} 
          size="small" 
          style={{ 
            backgroundColor: getBadgeColor(dayEvents[0].key),
            boxShadow: 'none'
          }} 
          overflowCount={9} 
        />
      </div>
    );
  };

  // Get badge color based on event type
  const getBadgeColor = (eventKey) => {
    const colorMap = {
      filing_date: '#1890ff',  // blue
      trial_date: '#f5222d',    // red
      incident_date: '#fa8c16', // orange
      created_at: '#52c41a'     // green
    };
    return colorMap[eventKey] || '#d9d9d9';
  };

  // Navigate to a specific date in calendar
  const navigateToDate = (date) => {
    setSelectedDate(date);
  };

  // Handle month change in calendar
  const onPanelChange = (date, mode) => {
    // Only update if mode changes or if in month view
    if (mode === 'month') {
      setSelectedDate(date);
    }
  };

  return (
    <Card
      title={
        <span>
          <CalendarOutlined /> Case Timeline
        </span>
      }
      style={{ width: '100%', marginTop: '16px' }}
    >
      {events.length > 0 ? (
        <>
          <div className="compact-calendar">
            <Calendar
              dateCellRender={dateCellRender}
              mode="month"
              fullscreen={false}
              value={selectedDate}
              onChange={navigateToDate}
              onPanelChange={onPanelChange}
            />
          </div>
          
          <div className="calendar-dates-list">
            <Text strong style={{ fontSize: '16px', marginBottom: '12px', display: 'block' }}>
              Important Dates
            </Text>
            <List
              className="case-timeline-list"
              dataSource={events}
              renderItem={(event) => (
                <List.Item
                  style={{ 
                    cursor: 'pointer',
                    borderBottom: '1px solid #f0f0f0',
                    padding: '8px 0'
                  }}
                  onClick={() => navigateToDate(event.date)}
                >
                  <Space size="middle" align="center">
                    <Badge
                      color={getBadgeColor(event.key)}
                      text=""
                    />
                    <Text strong>{event.formattedDate}</Text>
                    <Text type="secondary">{event.label}</Text>
                  </Space>
                </List.Item>
              )}
            />
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '24px' }}>
          <Text type="secondary">No dates found for this case</Text>
        </div>
      )}
    </Card>
  );
}

export default CaseCalendar;