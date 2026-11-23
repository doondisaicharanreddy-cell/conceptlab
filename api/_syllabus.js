// Single source of truth: ICSE-aligned topic map (indicative; verify against the current CISCE syllabus).
// sim: built-in simulation id | 'ai' (generated from a scanned page) | null (planned)
const rows = [
['m-place',1,3,'Maths','Place value',null],['m-shapes',1,4,'Maths','Shapes and symmetry',null],['m-fractions',3,5,'Maths','Fractions','fractions'],
['m-angles',5,7,'Maths','Angles',null],['m-area',6,8,'Maths','Area and perimeter','ai'],['m-ratio',6,8,'Maths','Ratio and proportion','ai'],
['m-pyth',8,9,'Maths','Pythagoras theorem','ai'],['m-interest',8,10,'Maths','Simple and compound interest','ai'],['m-linear',8,10,'Maths','Linear equations and graphs','ai'],['m-trig',9,10,'Maths','Trigonometry','ai'],
['p-speed',6,8,'Physics','Speed, distance and time','speed'],['p-light',7,8,'Physics','Reflection of light','reflection'],['p-density',7,8,'Physics','Density','ai'],
['p-circuit',8,10,'Physics',"Electric circuits and Ohm's law",'circuit'],['p-pressure',8,9,'Physics','Pressure','ai'],['p-sound',8,10,'Physics','Sound waves',null],
['p-force',9,10,'Physics',"Force and Newton's laws",'force'],['p-fall',9,10,'Physics','Gravity and free fall','freefall'],['p-work',9,10,'Physics','Work, energy and power','ai'],
['p-moments',9,10,'Physics','Moments and levers',null],['p-refract',9,10,'Physics','Refraction of light',null],['p-lens',10,10,'Physics','Lenses',null],['p-proj',11,11,'Physics','Projectile motion','projectile'],
['c-states',6,8,'Chemistry','States of matter',null],['c-atom',8,10,'Chemistry','Atomic structure',null],['c-gas',9,10,'Chemistry','Gas laws','ai'],['c-mole',10,10,'Chemistry','Mole concept','ai'],
['b-water',4,6,'Biology','Water cycle',null],['b-photo',6,8,'Biology','Photosynthesis',null],['b-cell',6,8,'Biology','Cell structure',null],['b-heart',9,10,'Biology','Human heart and circulation',null]];
module.exports = rows.map(([id, from, to, subject, topic, sim]) => ({ id, from, to, subject, topic, sim }));
