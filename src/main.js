        if (!id) {
            const hash = await hashPassword(password);
            const newUser = {
                id: 'usr-' + Date.now(),
                name,
                username,
                role,
                passwordHash: hash,
                password: password
            };
            const inserted = await insertUserInDB(newUser);
            appState.users.push(inserted);
        } else {
            const idx = appState.users.findIndex(u => u.id === id);
            if (idx > -1) {
                const updatedFields = {
                    name,
                    username,
                    role
                };
                if (password) {
                    updatedFields.passwordHash = await hashPassword(password);
                }
                const updated = await updateUserInDB(id, updatedFields);
                Object.assign(appState.users[idx], updated);
            }
        }