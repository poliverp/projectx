// src/pages/CasePage/components/CaseCalendar.jsx
import React, { useMemo } from 'react';
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
  // Extract and format all dates from case
  const { events, dateRange } = useMemo(() => {
    const events = [];
    let minDate = null;
    let maxDate = null;

    if (!caseDetails) return { events: [], dateRange: null };

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
          // Use your existing formatDate function
          formattedDate: formatDate(value)
        });

        // Update min/max dates
        if (!minDate || dateObj.isBefore(minDate)) {
          minDate = dateObj;
        }
        if (!maxDate || dateObj.isAfter(maxDate)) {
          maxDate = dateObj;
        }
      } catch (error) {
        console.error(`Error parsing date for ${key}:`, value, error);
      }
    });

    // Sort events by date
    events.sort((a, b) => a.date.valueOf() - b.date.valueOf());

    // Calculate date range with one year padding
    let range = null;
    if (minDate && maxDate) {
      range = {
        start: minDate.subtract(1, 'year'),
        end: maxDate.add(1, 'year')
      };
    }

    return { events, dateRange: range };
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

  // Custom cell renderer for calendar
  const dateCellRender = (current) => {
    const dateKey = current.format('YYYY-MM-DD');
    const dayEvents = eventsByDate.get(dateKey);
    
    if (!dayEvents) return null;

    return (
      <ul style={{ margin: 0, padding: 0 }}>
        {dayEvents.map((event, index) => (
          <li key={event.key} style={{ listStyle: 'none' }}>
            <Badge
              color={getBadgeColor(event.key)}
              text=""
              style={{ display: 'inline-block', marginRight: '4px' }}
            />
          </li>
        ))}
      </ul>
    );
  };

  // Get badge color based on event type
  const getBadgeColor = (eventKey) => {
    const colorMap = {
      filing_date: 'blue',
      trial_date: 'red',
      incident_date: 'orange',
      created_at: 'green'
    };
    return colorMap[eventKey] || 'default';
  };

  // Scroll to date in calendar
  const scrollToDate = (date) => {
    const calendarContainer = document.querySelector('.ant-picker-calendar');
    if (!calendarContainer) return;

    // Get the month panel for the target date
    const dateKey = date.format('YYYY-MM');
    const monthPanel = calendarContainer.querySelector(`[data-date="${dateKey}"]`);
    
    if (monthPanel) {
      monthPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Get valid date range for calendar
  const validRange = useMemo(() => {
    if (!dateRange) return undefined;
    return [dateRange.start, dateRange.end];
  }, [dateRange]);

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
          <Calendar
            dateCellRender={dateCellRender}
            mode="month"
            validRange={validRange}
            defaultValue={events[0]?.date}
          />
          
          <div style={{ marginTop: '24px' }}>
            <Text strong style={{ fontSize: '16px', marginBottom: '12px', display: 'block' }}>
              Important Dates
            </Text>
            <List
              dataSource={events}
              renderItem={(event) => (
                <List.Item
                  style={{ 
                    cursor: 'pointer',
                    borderBottom: '1px solid #f0f0f0',
                    padding: '8px 0'
                  }}
                  onClick={() => scrollToDate(event.date)}
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