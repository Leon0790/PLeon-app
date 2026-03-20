import React,{useState,useEffect} from "react";
import {LineChart,Line,XAxis,YAxis,Tooltip,CartesianGrid,ResponsiveContainer} from "recharts";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { db } from "./firebase";
import { collection, addDoc, getDocs, updateDoc, doc } from "firebase/firestore";

const subjects=["Mathematics","English","Science","Kiswahili"];

const grades=["7","8","9"];
const terms=["Term 1","Term 2","Term 3"];

function getGrade(mark){
if(mark>=81) return "EE";
if(mark>=61) return "ME";
if(mark>=41) return "AE";
return "BE";
}

export default function App(){

const [page,setPage]=useState("login");
const [email,setEmail]=useState("");
const [password,setPassword]=useState("");
const [user,setUser]=useState("");

const [learners,setLearners]=useState([]);
const [name,setName]=useState("");
const [grade,setGrade]=useState("7");
const [term,setTerm]=useState("Term 1");

useEffect(()=>{
loadLearners();
},[]);

async function loadLearners(){
const snapshot=await getDocs(collection(db,"learners"));
let list=[];
snapshot.forEach(doc=>{
list.push({...doc.data(),id:doc.id});
});
setLearners(list);
}

async function createAccount(){
await addDoc(collection(db,"teachers"),{email,password});
alert("Account created");
setPage("login");
}

async function login(){
const snapshot=await getDocs(collection(db,"teachers"));
let found=false;

snapshot.forEach(doc=>{
const data=doc.data();
if(data.email===email && data.password===password){
found=true;
}
});

if(found){
setUser(email);
setPage("dashboard");
}else{
alert("Wrong login");
}
}

async function addLearner(){
await addDoc(collection(db,"learners"),{
name,
grade,
term,
marks:{}
});
setName("");
loadLearners();
}

async function updateMark(l,subject,value){
const ref=doc(db,"learners",l.id);
await updateDoc(ref,{
[`marks.${subject}`]:Number(value)
});
loadLearners();
}

function avg(l){
let total=0,count=0;
subjects.forEach(s=>{
if(l.marks?.[s]!==undefined){
total+=l.marks[s];
count++;
}
});
return count?Math.round(total/count):0;
}

function ranked(){
let arr=learners.map(l=>({...l,avg:avg(l)}));
arr.sort((a,b)=>b.avg-a.avg);
return arr;
}

function downloadReport(l){
const docPDF=new jsPDF();

docPDF.text("CBE REPORT CARD",70,20);
docPDF.text("Learner: "+l.name,20,40);
docPDF.text("Grade: "+l.grade,20,50);
docPDF.text("Term: "+l.term,20,60);

let rows=subjects.map(s=>{
const mark=l.marks?.[s]??"";
const grade=mark!==""?getGrade(mark):"";
return [s,mark,grade];
});

docPDF.autoTable({
startY:70,
head:[["Subject","Marks","Grade"]],
body:rows
});

docPDF.text("Average: "+avg(l),20,200);
docPDF.save(l.name+".pdf");
}

const chartData=ranked().map(l=>({
name:l.name,
avg:l.avg
}));

if(page==="login") return(
<div style={{padding:40}}>
<h1>LEONMUD Tracker</h1>
<input placeholder="Email" onChange={e=>setEmail(e.target.value)}/>
<br/><br/>
<input type="password" placeholder="Password" onChange={e=>setPassword(e.target.value)}/>
<br/><br/>
<button onClick={login}>Login</button>
<button onClick={()=>setPage("create")}>Create Account</button>
</div>
);

if(page==="create") return(
<div style={{padding:40}}>
<h2>Create Account</h2>
<input placeholder="Email" onChange={e=>setEmail(e.target.value)}/>
<br/><br/>
<input type="password" placeholder="Password" onChange={e=>setPassword(e.target.value)}/>
<br/><br/>
<button onClick={createAccount}>Create</button>
</div>
);

return(
<div style={{padding:20}}>

<h2>Welcome {user}</h2>

<h3>Add Learner</h3>
<input placeholder="Name" value={name} onChange={e=>setName(e.target.value)}/>
<select onChange={e=>setGrade(e.target.value)}>
{grades.map(g=><option key={g}>{g}</option>)}
</select>
<select onChange={e=>setTerm(e.target.value)}>
{terms.map(t=><option key={t}>{t}</option>)}
</select>

<button onClick={addLearner}>Add</button>

<table border="1">
<thead>
<tr>
<th>Name</th>
<th>Grade</th>
<th>Term</th>
{subjects.map(s=><th key={s}>{s}</th>)}
<th>Avg</th>
</tr>
</thead>

<tbody>
{ranked().map(l=>(
<tr key={l.id}>
<td>{l.name}</td>
<td>{l.grade}</td>
<td>{l.term}</td>

{subjects.map(s=>(
<td key={s}>
<input
type="number"
value={l.marks?.[s]??""}
onChange={e=>updateMark(l,s,e.target.value)}
/>
</td>
))}

<td>{l.avg}</td>

<td>
<button onClick={()=>downloadReport(l)}>PDF</button>
</td>

</tr>
))}
</tbody>
</table>

<h3>Performance Chart</h3>

<ResponsiveContainer width="100%" height={300}>
<LineChart data={chartData}>
<CartesianGrid strokeDasharray="3 3"/>
<XAxis dataKey="name"/>
<YAxis/>
<Tooltip/>
<Line dataKey="avg"/>
</LineChart>
</ResponsiveContainer>

</div>
);
}
