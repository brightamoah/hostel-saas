import { eq } from "drizzle-orm";
import { admin, allocation, billing, companyMember, hostel, room, student, user } from "~~/server/db/schema";

export async function importData(companyId: number, validatedData: Record<string, { valid: any[]; updated: any[] }>) {
  const { db } = useDB();

  return await db.transaction(async (tx) => {
    const hostelMap = new Map<string, number>();
    const roomMap = new Map<string, number>();
    const userMap = new Map<string, number>();
    const studentMap = new Map<string, number>();
    const allocationRefMap = new Map<string, number>();

    // Helper to get or fetch hostel
    const resolveHostel = async (name: string) => {
      const hostelName = String(name).toLowerCase();
      let hostelId = hostelMap.get(hostelName);
      if (!hostelId) {
        const existing = await tx
          .query
          .hostel
          .findFirst({
            where: {
              name,
              companyId,
            },
          });

        if (!existing) throw new Error(`Hostel '${name}' not found`);

        hostelId = existing.id;
        hostelMap.set(hostelName, hostelId);
      }
      return hostelId;
    };

    // Helper to get or fetch room
    const resolveRoom = async (roomNumber: string, hostelId: number) => {
      const key = `${String(roomNumber).toLowerCase()}_${hostelId}`;
      let roomId = roomMap.get(key);
      if (!roomId) {
        const existing = await tx
          .query
          .room
          .findFirst({
            where: {
              roomNumber,
              hostelId,
            },
          });

        if (!existing) throw new Error(`Room '${roomNumber}' not found in specified hostel`);

        roomId = existing.id;
        roomMap.set(key, roomId);
      }
      return roomId;
    };

    // 1. Hostels
    const hostelsData = validatedData.Hostels;
    if (hostelsData?.valid && hostelsData.valid.length > 0) {
      for (const hostelItem of hostelsData.valid) {
        const [newHostel] = await tx
          .insert(hostel)
          .values({
            name: String(hostelItem.name),
            slug: String(hostelItem.slug),
            companyId,
            address: String(hostelItem.address),
            contactNumber: String(hostelItem.contactNumber),
            email: String(hostelItem.email),
            status: String(hostelItem.status) as "active" | "inactive" | "under renovation",
            supportEmail: hostelItem.supportEmail ? String(hostelItem.supportEmail) : null,
            supportPhone: hostelItem.supportPhone ? String(hostelItem.supportPhone) : undefined,
            joinCode: hostelItem.joinCode ? String(hostelItem.joinCode) : null,
          })
          .returning({ id: hostel.id });
        hostelMap.set(String(hostelItem.name).toLowerCase(), newHostel!.id);
      }
    }
    if (hostelsData?.updated && hostelsData.updated.length > 0) {
      for (const hostelItem of hostelsData.updated) {
        await tx.update(hostel).set({
          name: String(hostelItem.name),
          slug: String(hostelItem.slug),
          address: String(hostelItem.address),
          contactNumber: String(hostelItem.contactNumber),
          email: String(hostelItem.email),
          status: String(hostelItem.status) as "active" | "inactive" | "under renovation",
          supportEmail: hostelItem.supportEmail ? String(hostelItem.supportEmail) : null,
          supportPhone: hostelItem.supportPhone ? String(hostelItem.supportPhone) : null,
          joinCode: hostelItem.joinCode ? String(hostelItem.joinCode) : null,
        }).where(eq(hostel.id, hostelItem._id));
        hostelMap.set(String(hostelItem.name).toLowerCase(), hostelItem._id);
      }
    }

    // 2. Rooms
    const roomsData = validatedData.Rooms;
    if (roomsData?.valid && roomsData.valid.length > 0) {
      for (const roomItem of roomsData.valid) {
        const hostelId = await resolveHostel(String(roomItem.hostelName));

        let capacity = 1;
        if (roomItem.roomType === "double") capacity = 2;
        if (roomItem.roomType === "triple") capacity = 3;
        if (roomItem.roomType === "quad") capacity = 4;

        const [newRoom] = await tx
          .insert(room)
          .values({
            roomNumber: String(roomItem.roomNumber),
            hostelId,
            companyId,
            floor: Number(roomItem.floor),
            capacity,
            roomType: String(roomItem.roomType) as "single" | "double" | "triple" | "quad",
            amountPerYear: Number(roomItem.amountPerYear),
            status: String(roomItem.status) as "vacant" | "fully occupied" | "partially occupied" | "under maintenance" | "reserved",
            allowedGender: String(roomItem.allowedGender) as "male" | "female" | "mixed" | "unassigned",
            features: roomItem.features ? String(roomItem.features).split(",").map(f => f.trim()).filter(Boolean) : [],
          })
          .returning({ id: room.id });

        roomMap.set(`${String(roomItem.roomNumber).toLowerCase()}_${hostelId}`, newRoom!.id);
      }
    }
    if (roomsData?.updated && roomsData.updated.length > 0) {
      for (const roomItem of roomsData.updated) {
        let capacity = 1;
        if (roomItem.roomType === "double") capacity = 2;
        if (roomItem.roomType === "triple") capacity = 3;
        if (roomItem.roomType === "quad") capacity = 4;

        await tx.update(room).set({
          roomNumber: String(roomItem.roomNumber),
          floor: Number(roomItem.floor),
          capacity,
          roomType: String(roomItem.roomType) as "single" | "double" | "triple" | "quad",
          amountPerYear: Number(roomItem.amountPerYear),
          status: String(roomItem.status) as "vacant" | "fully occupied" | "partially occupied" | "under maintenance" | "reserved",
          allowedGender: String(roomItem.allowedGender) as "male" | "female" | "mixed" | "unassigned",
          features: roomItem.features ? String(roomItem.features).split(",").map(f => f.trim()).filter(Boolean) : [],
        }).where(eq(room.id, roomItem._id));

        const hostelId = await resolveHostel(String(roomItem.hostelName));
        roomMap.set(`${String(roomItem.roomNumber).toLowerCase()}_${hostelId}`, roomItem._id);
      }
    }

    // 3. Students
    const studentsData = validatedData.Students;
    if (studentsData?.valid && studentsData.valid.length > 0) {
      for (const studentItem of studentsData.valid) {
        const email = String(studentItem.userEmail).toLowerCase();
        let uId = userMap.get(email);
        if (!uId) {
          const existingUser = await tx
            .query
            .user
            .findFirst({ where: { email } });
          if (existingUser) {
            uId = existingUser.id;
          }
          else {
            let password = "defaultPassword123!";
            let name = studentItem.emergencyContactName ? String(studentItem.emergencyContactName) : "Student User"; // Fallback name

            const sheetUser = validatedData.Users?.valid?.find((u: Record<string, unknown>) => String(u.email).toLowerCase() === email);
            if (sheetUser) {
              password = String(sheetUser.password);
              name = String(sheetUser.name);
            }

            const [newUser] = await tx.insert(user).values({
              email,
              name: String(name),
              password: await hash(String(password)),
              role: "student",
            }).returning({ id: user.id });
            uId = newUser!.id;
          }
          userMap.set(email, uId);
        }

        const [newStudent] = await tx.insert(student).values({
          userId: uId,
          companyId,
          gender: String(studentItem.gender) as "male" | "female",
          dateOfBirth: new Date(String(studentItem.dateOfBirth)).toISOString().split("T")[0] as string,
          phoneNumber: String(studentItem.phoneNumber),
          address: String(studentItem.address),
          emergencyContactName: String(studentItem.emergencyContactName),
          emergencyContactPhoneNumber: String(studentItem.emergencyContactPhone),
          residencyStatus: String(studentItem.residencyStatus) as "active" | "inactive" | "suspended" | "graduated" | "withdrawn",
        }).returning({ id: student.id });

        studentMap.set(email, newStudent!.id);
      }
    }
    if (studentsData?.updated && studentsData.updated.length > 0) {
      for (const studentItem of studentsData.updated) {
        await tx.update(student).set({
          gender: String(studentItem.gender) as "male" | "female",
          dateOfBirth: new Date(String(studentItem.dateOfBirth)).toISOString().split("T")[0] as string,
          phoneNumber: String(studentItem.phoneNumber),
          address: String(studentItem.address),
          emergencyContactName: studentItem.emergencyContactName ? String(studentItem.emergencyContactName) : undefined,
          emergencyContactPhoneNumber: studentItem.emergencyContactPhone ? String(studentItem.emergencyContactPhone) : undefined,
        }).where(eq(student.id, studentItem._id));
        const email = String(studentItem.userEmail).toLowerCase();
        studentMap.set(email, studentItem._id);
      }
    }

    // 4. Admins
    const adminsData = validatedData.Admins;
    if (adminsData?.valid && adminsData.valid.length > 0) {
      for (const adminItem of adminsData.valid) {
        const email = String(adminItem.userEmail).toLowerCase();
        let uId = userMap.get(email);
        if (!uId) {
          const existingUser = await tx
            .query
            .user
            .findFirst({ where: { email } });

          if (existingUser) {
            uId = existingUser.id;
          }
          else {
            let password = "defaultAdminPassword123!";
            const sheetUser = validatedData.Users?.valid?.find((u: Record<string, unknown>) => String(u.email).toLowerCase() === email);

            if (sheetUser) password = String(sheetUser.password);

            const [newUser] = await tx.insert(user).values({
              email,
              name: "Admin User", // fallback since Admin sheet doesn't have name
              password: await hash(String(password)),
              role: "admin",
            }).returning({ id: user.id });
            uId = newUser!.id;
          }
          userMap.set(email, uId);
        }

        let hostelId = null;
        if (adminItem.hostelName) {
          hostelId = await resolveHostel(String(adminItem.hostelName));
        }

        await tx.insert(admin).values({
          userId: uId,
          companyId,
          phoneNumber: String(adminItem.phoneNumber),
          department: String(adminItem.department),
          accessLevel: String(adminItem.accessLevel) as "regular" | "super" | "support",
          hostelId,
        });

        // Add to companyMember
        await tx.insert(companyMember).values({
          userId: uId,
          companyId,
          role: "admin",
          status: "active",
        });
      }
    }
    if (adminsData?.updated && adminsData.updated.length > 0) {
      for (const adminItem of adminsData.updated) {
        let hostelId = null;
        if (adminItem.hostelName) {
          hostelId = await resolveHostel(String(adminItem.hostelName));
        }
        await tx.update(admin).set({
          phoneNumber: String(adminItem.phoneNumber),
          department: adminItem.department ? String(adminItem.department) : undefined,
          accessLevel: String(adminItem.accessLevel) as "regular" | "super" | "support",
          hostelId,
        }).where(eq(admin.id, adminItem._id));
      }
    }

    // 5. Allocations
    const allocationsData = validatedData.Allocations;
    if (allocationsData?.valid && allocationsData.valid.length > 0) {
      for (const allocationItem of allocationsData.valid) {
        const email = String(allocationItem.studentEmail).toLowerCase();
        let sId = studentMap.get(email);
        if (!sId) {
          const existingUser = await tx
            .query
            .user
            .findFirst({ where: { email } });

          if (!existingUser) throw new Error(`Student user '${email}' not found for allocation`);

          const existingStudent = await tx
            .query
            .student
            .findFirst({ where: { userId: existingUser.id } });

          if (!existingStudent) throw new Error(`Student profile '${email}' not found for allocation`);
          sId = existingStudent.id;
          studentMap.set(email, sId);
        }

        const hostelId = await resolveHostel(String(allocationItem.hostelName));
        const roomId = await resolveRoom(String(allocationItem.roomNumber), hostelId);

        const [newAlloc] = await tx.insert(allocation).values({
          studentId: sId,
          hostelId,
          roomId,
          companyId,
          allocationDate: new Date(String(allocationItem.allocationDate)).toISOString().split("T")[0] as string,
          academicPeriod: String(allocationItem.academicPeriod) as "first semester" | "second semester" | "entire year" | "vacation period",
          academicYear: String(allocationItem.academicYear),
          status: String(allocationItem.status) as "active" | "expired" | "pending" | "cancelled",
        }).returning({ id: allocation.id });

        // Use studentEmail + roomNumber as a rough "ref" if billing attempts to map it
        allocationRefMap.set(`${email}_${String(allocationItem.roomNumber).toLowerCase()}`, newAlloc!.id);
      }
    }

    // 6. Billing
    const billingData = validatedData.Billing;
    if (billingData?.valid && billingData.valid.length > 0) {
      for (const billingItem of billingData.valid) {
        const email = String(billingItem.studentEmail).toLowerCase();
        let sId = studentMap.get(email);
        if (!sId) {
          const existingUser = await tx
            .query
            .user
            .findFirst({ where: { email } });

          if (existingUser) {
            const existingStudent = await tx
              .query
              .student
              .findFirst({ where: { userId: existingUser.id } });
            if (existingStudent) sId = existingStudent.id;
          }
        }
        if (!sId) throw new Error(`Student '${email}' not found for billing`);

        const hostelId = await resolveHostel(String(billingItem.hostelName));

        // Try to map allocation reference. If they just provided a generic ref, we look it up or use the latest.
        // Actually, billing requires allocationId in our schema.
        // If allocationRef isn't mapped, we might have to query the latest active allocation for this student
        let allocationId = allocationRefMap.get(`${email}_${String(billingItem.allocationRef || "").toLowerCase()}`);
        if (!allocationId) {
          const existingAlloc = await tx
            .query
            .allocation
            .findFirst({
              where: {
                studentId: sId,
                hostelId,
              },
              orderBy: (cols, { desc }) => [desc(cols.createdAt)],
            });
          if (!existingAlloc) throw new Error(`Allocation not found for student '${email}' in billing`);
          allocationId = existingAlloc.id;
        }

        await tx.insert(billing).values({
          studentId: sId,
          hostelId,
          companyId,
          allocationId,
          amount: String(billingItem.amount),
          type: String(billingItem.billingType) as "hostel fee" | "security deposit" | "utility fee" | "maintenance fee" | "late payment penalty" | "other",
          academicPeriod: String(billingItem.academicPeriod) as "first semester" | "second semester" | "entire year" | "vacation period",
          description: `Imported ${String(billingItem.billingType)}`,
          dueDate: new Date(String(billingItem.dueDate)).toISOString().split("T")[0] as string,
          status: String(billingItem.status) as "unpaid" | "fully paid" | "partially paid" | "overdue" | "cancelled",
        });
      }
    }

    return { success: true };
  });
}
