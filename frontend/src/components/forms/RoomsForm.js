import React from "react";
import { Plus, Trash2, DoorOpen, FlaskConical } from "lucide-react";
export const RoomsForm = ({ rooms, onChangeRooms }) => {
    const handleAddRoom = (type) => {
        const nextIdx = rooms.length + 1;
        const newRoom = {
            id: `room-${Date.now()}`,
            name: type === "classroom" ? `LH-${100 + nextIdx}` : `Specialized Lab ${nextIdx}`,
            type,
            capacity: 60,
            labType: type === "lab" ? "computing-lab" : undefined,
        };
        onChangeRooms([...rooms, newRoom]);
    };
    const handleUpdateRoom = (id, partial) => {
        onChangeRooms(rooms.map((r) => (r.id === id ? { ...r, ...partial } : r)));
    };
    const handleRemoveRoom = (id) => {
        if (rooms.length === 1) {
            alert("At least one room or lab must exist.");
            return;
        }
        onChangeRooms(rooms.filter((r) => r.id !== id));
    };
    return (<div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-2">
        <div className="flex items-center gap-2">
          <DoorOpen className="w-5 h-5 text-indigo-600"/>
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Classrooms & Laboratories
            </h2>
            <p className="text-xs text-slate-500">
              Configure theory lecture halls and specialized labs with matching lab types.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={() => handleAddRoom("classroom")} className="inline-flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition">
            <Plus className="w-3.5 h-3.5"/>
            <span>Add Classroom</span>
          </button>
          <button type="button" onClick={() => handleAddRoom("lab")} className="inline-flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition">
            <FlaskConical className="w-3.5 h-3.5"/>
            <span>Add Lab</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2 px-3 font-medium">Room Name / Number</th>
              <th className="py-2 px-3 font-medium">Type</th>
              <th className="py-2 px-3 font-medium">Capacity (Optional)</th>
              <th className="py-2 px-3 font-medium">Specialized Lab Type Tag</th>
              <th className="py-2 px-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rooms.map((room) => (<tr key={room.id} className="hover:bg-slate-50/50">
                <td className="py-2 px-3">
                  <input type="text" value={room.name} onChange={(e) => handleUpdateRoom(room.id, { name: e.target.value })} className="w-full px-2 py-1 font-medium border border-slate-300 rounded text-xs focus:ring-1 focus:ring-indigo-500" placeholder="e.g. LH-101"/>
                </td>

                <td className="py-2 px-3 w-36">
                  <select value={room.type} onChange={(e) => handleUpdateRoom(room.id, {
                type: e.target.value,
                labType: e.target.value === "lab" ? "computing-lab" : undefined,
            })} className="w-full px-2 py-1 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-indigo-500">
                    <option value="classroom">Classroom</option>
                    <option value="lab">Laboratory</option>
                  </select>
                </td>

                <td className="py-2 px-3 w-32">
                  <input type="number" min={1} value={room.capacity || ""} onChange={(e) => handleUpdateRoom(room.id, {
                capacity: e.target.value ? parseInt(e.target.value) : undefined,
            })} className="w-20 px-2 py-1 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-indigo-500" placeholder="60"/>
                </td>

                <td className="py-2 px-3 w-48">
                  {room.type === "lab" ? (<input type="text" value={room.labType || ""} onChange={(e) => handleUpdateRoom(room.id, { labType: e.target.value })} className="w-full px-2 py-1 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 font-mono" placeholder="e.g. computing-lab"/>) : (<span className="text-slate-400 text-xs">-</span>)}
                </td>

                <td className="py-2 px-3 text-right">
                  <button type="button" onClick={() => handleRemoveRoom(room.id)} className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition" title="Delete room">
                    <Trash2 className="w-4 h-4"/>
                  </button>
                </td>
              </tr>))}
          </tbody>
        </table>
      </div>
    </div>);
};
