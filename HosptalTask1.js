let patients = [{name: "Ali",severity: 3,hasData: true,condition: "normal"},{name: "Sara",severity: 5,hasData: true,condition: "critical"},{name: "Omar",severity: 4,hasData: false,condition: "normal"}];



function Hosptal(patients)
{
let missingDataList=[];
let treatedImmediately=[];
let ListPatients=[];
patients.forEach(patient => {
if(patient.hasData === false)
{
    missingDataList.push(patient);
    return;
}

else if(patient.condition==='critical')
{
    treatedImmediately.push(patient);
}
else
{
    ListPatients.push(patient);
}



});

ListPatients.sort((a,b) => b.severity - a.severity);

return { missingDataList, treatedImmediately,ListPatients};


}



const result = Hosptal(patients);
console.log("Missing Data List:", result.missingDataList);
console.log("Treated Immediately:", result.treatedImmediately);
console.log("List of Patients (sorted by severity):", result.ListPatients);
