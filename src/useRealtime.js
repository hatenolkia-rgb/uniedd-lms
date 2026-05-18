import { useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'

/**
 * useRealtime — auto-refreshes data when Supabase table changes
 *
 * Usage in any dashboard:
 *
 *   useRealtime('students', fetchStudents)
 *   useRealtime('attendance', fetchAttendance)
 *   useRealtime(['students', 'courses'], fetchAll)  // multiple tables
 *
 * @param {string|string[]} tables  - table name(s) to watch
 * @param {function}        onUpdate - callback to re-fetch data
 * @param {string}          [filter] - optional Supabase filter e.g. "student_id=eq.123"
 */
export function useRealtime(tables, onUpdate, filter = null) {
  const cbRef = useRef(onUpdate)
  cbRef.current = onUpdate

  useEffect(() => {
    const tableList = Array.isArray(tables) ? tables : [tables]
    const channels = []

    tableList.forEach((table) => {
      const channelConfig = {
        event: '*',
        schema: 'public',
        table,
      }
      if (filter) channelConfig.filter = filter

      const channel = supabase
        .channel(`realtime-${table}-${Math.random()}`)
        .on('postgres_changes', channelConfig, () => {
          cbRef.current()
        })
        .subscribe()

      channels.push(channel)
    })

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch))
    }
  }, [tables, filter])
}
