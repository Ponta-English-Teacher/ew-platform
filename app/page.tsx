import { supabase } from "../lib/supabaseClient"

export default async function Home() {

  const { data: lanes, error } = await supabase
    .from("ew_lanes")
    .select("*")
    .order("sort_order")

  if (error) {
    return <div>Error loading lanes</div>
  }

  return (
    <div style={{padding:40}}>
      <h1>EW Discussion Platform</h1>

      {lanes?.map((lane:any) => (
        <div key={lane.id} style={{marginTop:20}}>
          <h2>{lane.lane_key} — {lane.lane_title}</h2>
          <p>{lane.head_post}</p>
        </div>
      ))}

    </div>
  )
}