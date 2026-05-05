const fs = require('fs');
let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

schema = schema.replace(/instructor\  User\ \ \ \ \ \ \ \ \ \ \ \ \@relation\(\"InstructorCourses\"\, fields: \[instructorId\], references: \[id\]\)/g, 'instructor  User            @relation("InstructorCourses", fields: [instructorId], references: [id], onDelete: Cascade)');

schema = schema.replace(/student\ \ \ \ User\ \ \ \ \ \ \ \ \@relation\(fields: \[studentId\], references: \[id\]\)/g, 'student    User        @relation(fields: [studentId], references: [id], onDelete: Cascade)');

schema = schema.replace(/student\ \ \ \ \ \ \ \ \ \ \ \ \ \ User\ \ \ \ \ \ \ \ \ \ \@relation\(fields: \[studentId\], references: \[id\]\)/g, 'student              User           @relation(fields: [studentId], references: [id], onDelete: Cascade)');

schema = schema.replace(/assignedByInstructor User\?\ \ \ \ \ \ \ \ \ \@relation\(\"AssignedQuizzes\"\, fields: \[assignedByInstructorId\], references: \[id\]\)/g, 'assignedByInstructor User?          @relation("AssignedQuizzes", fields: [assignedByInstructorId], references: [id], onDelete: SetNull)');

schema = schema.replace(/instructor\ \ \ User\ \ \ \ \ \ \ \ \ \ \ \ \ \@relation\(\"InstructorRooms\"\, fields: \[instructorId\], references: \[id\]\)/g, 'instructor   User              @relation("InstructorRooms", fields: [instructorId], references: [id], onDelete: Cascade)');

schema = schema.replace(/user User\ \ \ \ \@relation\(fields: \[userId\], references: \[id\]\)/g, 'user User     @relation(fields: [userId], references: [id], onDelete: Cascade)');

schema = schema.replace(/createdBy\ \ \ \ User\ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \@relation\(\"StudyRoomsCreated\"\, fields: \[createdById\], references: \[id\]\)/g, 'createdBy    User                   @relation("StudyRoomsCreated", fields: [createdById], references: [id], onDelete: Cascade)');

schema = schema.replace(/user User\ \ \ \ \ \@relation\(fields: \[userId\], references: \[id\]\)/g, 'user User      @relation(fields: [userId], references: [id], onDelete: Cascade)');

schema = schema.replace(/student\ \ \ \ User \@relation\(\"StudentSubscriptions\"\, fields: \[studentId\], references: \[id\]\)/g, 'student    User @relation("StudentSubscriptions", fields: [studentId], references: [id], onDelete: Cascade)');

schema = schema.replace(/instructor User \@relation\(\"InstructorSubscribers\"\, fields: \[instructorId\], references: \[id\]\)/g, 'instructor User @relation("InstructorSubscribers", fields: [instructorId], references: [id], onDelete: Cascade)');

fs.writeFileSync('prisma/schema.prisma', schema);
console.log('Schema updated.');
