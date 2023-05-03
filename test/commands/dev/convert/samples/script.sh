sfdx force:org:create -f config/project-scratch-def.json -a myorg -s -d 1
# now  we deploy
sfdx force:source:deploy -p force-app --target-org=myorg
sfdx force:source:status
#create user
sfdx force:user:create -f config/user-def.json -a myuser -o myorg
# assign permission set
sfdx force:user:permset:assign -n MyPermissionSet -u myorg
#generate password for the new user
sfdx force:user:password:generate -u myuser
sfdx force:package:install -p 04t1I0000000X0P -w 10 -u myorg
sfdx force:package:beta:version:list -p 04t1I0000000X0P
sfdx force:package:version:promote -p 04t1I0000000X0P -v 1.0.0.Beta_1 -u myorg

# now we run the tests
sfdx force:apex:test:run -u myorg -c -r=human -w 10


sfdx alias:set user=myuser
sfdx config:set defaultusername=user -g
