# Git Command Reference

## 📅 Daily Commands (Use These Regularly)

### Check Status
git status                    # See what files changed

### Save Changes
git add .                     # Stage all changes
git add file.js               # Stage specific file
git commit -m "Fix bug"       # Commit with message

### Sync with GitHub
git pull                      # Download latest changes
git push                      # Upload your commits

### View History
git log                       # See commit history
git log --oneline             # Compact view

----------------------------------------------

## 🔧 Occasional Commands (Use When Needed)

### Branching
git branch                    # List branches
git branch feature-name       # Create new branch
git checkout feature-name     # Switch to branch
git checkout -b feature-name  # Create and switch
git merge feature-name        # Merge branch into current
git branch -d feature-name    # Delete branch

### Undo Changes
git restore file.js           # Discard changes in file
git restore .                 # Discard all changes
git reset HEAD~1              # Undo last commit (keep changes)
git reset --hard HEAD~1       # Undo last commit (delete changes)

### View Differences
git diff                      # See unstaged changes
git diff --staged             # See staged changes
git diff main feature         # Compare branches

### Stash (Temporary Save)
git stash                     # Save changes temporarily
git stash pop                 # Restore stashed changes
git stash list                # List all stashes

### Remote Repository
git remote -v                 # Show remote URLs
git remote add origin URL     # Add remote repository
git remote remove origin      # Remove remote

### Clone Repository
git clone https://github.com/user/repo.git

-------------------------------------------

## ⚠️ Rare/Advanced Commands

### Rewrite History (Dangerous!)
git rebase main               # Reapply commits on top of main
git commit --amend            # Modify last commit message
git reset --hard origin/main  # Match remote exactly (destroys local changes)

### Tags (Version Releases)
git tag v1.0.0                # Create tag
git push --tags               # Push tags to GitHub


### Clean Up
git clean -fd                 # Remove untracked files
git gc                        # Garbage collection (optimize)

### Submodules
git submodule add URL         # Add submodule
git submodule update --init   # Initialize submodules

---

## 🔄 Typical Daily Workflow
# Start of day
git pull

# Make changes to files
# ... edit code ...

# Save work
git status                    # Check what changed
git add .                     # Stage changes
git commit -m "Description"   # Commit
git push                      # Upload to GitHub

# End of day - done!

---------------------------------------------------

## 🆘 Common Problems & Solutions

**Problem: Merge conflict**
# Edit conflicted files manually
git add .
git commit -m "Resolve conflict"

**Problem: Pushed wrong commit**
git revert HEAD               # Creates new commit that undoes last one
git push

**Problem: Want to discard everything**
git reset --hard HEAD         # Discard all local changes
git clean -fd                 # Remove untracked files

**Problem: Forgot to pull before editing**
git stash                     # Save your changes
git pull                      # Get latest
git stash pop                 # Restore your changes
# Fix any conflicts if needed

---------------------------------------------------

## 💡 Tips

- **Commit often** - Small commits are easier to track
- **Write clear messages** - "Fix login bug" not "asdf"
- **Pull before push** - Avoid conflicts
- **Use branches** - For new features
- **Don't commit sensitive data** - Use .gitignore

-------------------------------------------------
