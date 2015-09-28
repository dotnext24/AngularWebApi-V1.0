namespace SM.Store.Api.DAL.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class initialCreate : DbMigration
    {
        public override void Up()
        {
          
            
        }
        
        public override void Down()
        {
            DropForeignKey("dbo.Product", "StatusCode", "dbo.ProductStatusType");
            DropForeignKey("dbo.Product", "CategoryID", "dbo.Category");
            DropIndex("dbo.Product", new[] { "StatusCode" });
            DropIndex("dbo.Product", new[] { "CategoryID" });
            DropTable("dbo.Contact");
            DropTable("dbo.ProductStatusType");
            DropTable("dbo.Product");
            DropTable("dbo.Category");
        }
    }
}
