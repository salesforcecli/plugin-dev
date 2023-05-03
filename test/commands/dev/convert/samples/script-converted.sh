sf force:org:create -f config/project-scratch-def.json -a myorg -s -d 1 # ERROR converting this line, human intervention required
# now  we deploy
sf force:source:deploy -p force-app --target-org=myorg # ERROR converting this line, human intervention required
sf force:source:status # ERROR converting this line, human intervention required
#create user
sf force:user:create -f config/user-def.json -a myuser -o myorg # ERROR converting this line, human intervention required
# assign permission set
sf force:user:permset:assign -n MyPermissionSet --target-org myorg # ERROR converting this line, human intervention required
#generate password for the new user
sf force:user:password:generate --target-org myuser # ERROR converting this line, human intervention required
sf force:package:install -p 04t1I0000000X0P -w 10 --target-org myorg # ERROR converting this line, human intervention required
sf force:package:beta:version:list -p 04t1I0000000X0P # ERROR converting this line, human intervention required
sf force:package:version:promote -p 04t1I0000000X0P --target-dev-hub1.0.0.Beta_1 --target-org myorg # ERROR converting this line, human intervention required

# now we run the tests
sf force:apex:test:run --target-org myorg -c -r=human -w 10 # ERROR converting this line, human intervention required


sf alias:set user=myuser # ERROR converting this line, human intervention required
sf config:set defaultusername=user -g # ERROR converting this line, human intervention required
